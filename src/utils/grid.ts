import store from '@/store'
import { GRID_COLS } from './constants'
import { sleep } from './helpers'

export interface GridSpace {
  x?: number
  y?: number
  w?: number
  h?: number
}

export interface GridItem extends GridSpace {
  i: string
  type?: string
}

type GridAvailability = boolean[][]

export function forceResizeItem(item: GridItem) {
  const paneElement = document.getElementById(item.i)

  if (paneElement) {
    const gridItemElement = paneElement.parentElement as any
    gridItemElement.__vue__.$emit(
      'resized',
      item.i,
      item.h,
      item.w,
      gridItemElement.clientWidth,
      gridItemElement.clientHeight
    )
  }
}

export function initializeGrid(layout: GridItem[]) {
  const GRID_ROWS = GRID_COLS

  // Create a 2D array filled with false (unoccupied)
  const grid: GridAvailability = Array.from({ length: GRID_ROWS }, () =>
    Array(GRID_COLS).fill(false)
  )

  // Mark the occupied spaces based on the current layout
  layout.forEach(item => {
    for (let row = item.y; row < item.y + item.h; row++) {
      for (let col = item.x; col < item.x + item.w; col++) {
        // Check boundaries to avoid errors
        if (row < GRID_ROWS && col < GRID_COLS) {
          grid[row][col] = true // Mark as occupied
        }
      }
    }
  })

  return grid
}

export async function findOrCreateSpace(
  layout: GridItem[],
  originalItem?: GridItem
): Promise<GridSpace> {
  const grid = initializeGrid(layout)

  let space: GridSpace

  if (originalItem && originalItem.w && originalItem.h) {
    space = findAvailableSpace(grid, originalItem.w, originalItem.h)
  }

  if (!space) {
    space = findLargestAvailableSpace(grid)
  }

  if (!space) {
    space = await adjustDimensionsOrRearrange(grid, layout)
  }

  if (!space) {
    throw new Error('no space available')
  }

  return space
}

export function findAvailableSpace(
  grid: GridAvailability,
  w: number,
  h: number
) {
  const GRID_ROWS = grid.length
  const GRID_COLS = grid[0].length

  for (let row = 0; row <= GRID_ROWS - h; row++) {
    for (let col = 0; col <= GRID_COLS - w; col++) {
      if (isSpaceAvailable(grid, col, row, w, h)) {
        return { x: col, y: row, w: w, h: h }
      }
    }
  }

  // No suitable space found
  return null
}

export function isSpaceAvailable(
  grid: GridAvailability,
  startX: number,
  startY: number,
  w: number,
  h: number
) {
  for (let row = startY; row < startY + h; row++) {
    for (let col = startX; col < startX + w; col++) {
      if (grid[row][col]) {
        // Occupied space found, this spot won't work
        return false
      }
    }
  }
  return true // Suitable space found
}

export function findLargestAvailableSpace(grid) {
  let largestSpace = { w: 0, h: 0, x: -1, y: -1 }

  const GRID_ROWS = grid.length
  const GRID_COLS = grid[0].length

  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      if (!grid[row][col]) {
        // If the cell is unoccupied
        const space = calculateSpaceFromCell(grid, col, row)
        if (space.area > largestSpace.w * largestSpace.h) {
          largestSpace = {
            w: space.w,
            h: space.h,
            x: col,
            y: row
          }
        }
      }
    }
  }

  if (largestSpace.x < 0 || largestSpace.y < 0) {
    return null
  }

  return largestSpace
}

function calculateSpaceFromCell(
  grid: GridAvailability,
  startX: number,
  startY: number
) {
  const GRID_ROWS = grid.length
  const GRID_COLS = grid[0].length

  let w = 0
  let h = 0

  // Find the maximum w
  for (let col = startX; col < GRID_COLS && !grid[startY][col]; col++) {
    w++
  }

  // Find the maximum h for this w
  outer: for (let row = startY; row < GRID_ROWS; row++) {
    for (let col = startX; col < startX + w; col++) {
      if (grid[row][col]) {
        break outer
      }
    }
    h++
  }

  return { w: w, h: h, area: w * h }
}

export async function adjustDimensionsOrRearrange(
  grid: GridAvailability,
  layout: GridItem[]
) {
  // If adjusting dimensions is not feasible, resize the largest existing item
  const newlyCreatedSpace = await resizeLargestItem(layout)
  if (newlyCreatedSpace) {
    // Update the layout state
    grid = initializeGrid(layout) // Reinitialize the grid with the updated layout

    // After resizing, find space for the new item again
    const space = findAvailableSpace(
      grid,
      newlyCreatedSpace.w,
      newlyCreatedSpace.h
    )
    if (space) {
      return space
    }
  }

  // If no space is found even after resizing the largest widget
  return null
}

function findLargestItem(layout: GridItem[]): GridItem | null {
  let largestItem = null
  let maxArea = 0

  layout.forEach(widget => {
    const area = widget.w * widget.h
    if (area > maxArea) {
      maxArea = area
      largestItem = widget
    }
  })

  return largestItem
}

function adjustWidth(largestItem: GridItem) {
  // Halve the w of the largest widget
  // Ensure that the new w is at least 1 grid unit
  return Math.max(1, Math.floor(largestItem.w / 2))
}

function adjustHeight(largestItem: GridItem) {
  // Halve the h of the largest widget
  // Ensure that the new h is at least 1 grid unit
  return Math.max(1, Math.floor(largestItem.h / 2))
}

async function resizeLargestItem(layout: GridItem[]) {
  const largestItem = findLargestItem(layout)

  if (largestItem) {
    const createdSpace = {
      w: largestItem.w,
      h: largestItem.h
    }

    if (largestItem.w > largestItem.h) {
      // Decrease w
      createdSpace.w = adjustWidth(largestItem)
      largestItem.w = largestItem.w - createdSpace.w
    } else {
      // Decrease h
      createdSpace.h = adjustHeight(largestItem)
      largestItem.h = largestItem.h - createdSpace.h
    }

    // Update the layout with the resized widget
    store.commit('panes/UPDATE_LAYOUT', layout)
    forceResizeItem(largestItem)

    await sleep(250)

    return createdSpace
  }

  // Return null if no largest widget is found or if it can't be resized
  return null
}
