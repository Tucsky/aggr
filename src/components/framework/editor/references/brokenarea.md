

```ts
brokenarea(cell: BrokenAreaCell, [options])
```

Draws a "broken cloud," or a shape with both a top and bottom value, capable of stopping and reappearing elsewhere without continuity. The `brokenarea` function is flexible enough to create rectangles, background fills, and even horizontal lines, enabling advanced plotting capabilities. When applied correctly, it can generate complex visualizations like heatmaps.

## Parameters

- **`cell`** — Defines the primary characteristics of the broken area.
- **`options`** *(optional)* — Allows additional customization, such as color and stroke properties.

## `BrokenAreaCell` Type

```ts
export interface BrokenAreaCell {
  time: number;             // Unix timestamp
  lowerValue: number;
  higherValue: number;
  extendRight?: boolean;
  infinite?: boolean;       // Draw beyond viewport if set to true
  color?: string;
  label?: string;
  id?: string;
}
```

## `BrokenAreaOptions` Type

```ts
export interface BrokenAreaOptions {
  color?: string;
  strokeColor?: string;
  strokeWidth?: number;
}
```

## Example Usage

### Basic Example (Suboptimal Usage)

```
brokenarea({
  time: time,
  lowerValue: 10,
  higherValue: 20,
  extendRight: true,
  color: 'yellow'
})
```

This example draws a rectangle extending infinitely to the right, which can function as a test but lacks practical application.

### Advanced Example (Dynamic Slot-Based Drawing)

The `brokenarea` function is most effective when used to dynamically allocate slots for drawing lines or rectangles on the chart. By defining multiple `brokenarea` slots programmatically, you gain greater control over redrawing and updating visual elements based on script logic.

```ts
// top of the script
if (!boundaries) {
  // check if boundaries isn't defined = initial run of the script

  // define some persistent script variables
  pendingRedraws = [] // number[]
  slots = [] // {index: number, redrawAt: number}[]

  // indicator related, but usefull to underestand the point
  cells = [] // {[normalizedCellPrice: number]: {strength: number, index: number, top: number, bottom: number, count: number}

  // here we make use of the series global variable
  for (var i = 0; i < series.length; i++) {
    if (series[i].seriesType() !== 'BrokenArea') {
      continue
    }

    // register each available series as a slot 
    slots.push({
      index: i,
      redrawAt: 0
    })

    // boundaries: { [cellId: string]: *bar index* }
    series[i].setExtensionsBoundaries(boundaries)
  }
}

// define the slots at whatever part of the script
brokenarea()
brokenarea()
brokenarea()
brokenarea()
brokenarea()
brokenarea()
brokenarea()
brokenarea()
brokenarea()
brokenarea()
brokenarea()
```

This binds the `boundaries` object to each series slot, allowing control over where each cell extension halts.

```ts
// at the bottom of the script, you would have something like this
// pendingRedraws here is an array of the cells that needs to be redrawn, each redraw use another object `cells`, a store for all the cells
if (pendingRedraws.length) {
  for (var i = 0; i < pendingRedraws.length; i++) {
    var cell = cells[pendingRedraws[i]]

    if (!cell) {
      // maybe cell doesn't exist anymore
      pendingRedraws.splice(i--, 1)
      continue
    }
    
    var slot = slots.find(slot => slot.redrawAt < bar.length)

    if (slot) {
      // lock that slot to NOT be used until next bar
      slot.redrawAt = bar.length + 1

      if (cell.id) {
        // this is the interesting part. it tells the cell previously drawn by that slot (with extendRight: true) to stop extending at the bar index `bar.length - 2`
        boundaries[cell.id] = bar.length - 2
      }
      
      // register a new cell id
      cell.id = Math.random().toString()

      // indicator related stuff based on our cell
      var ratio = Math.max(0.01, Math.min(1, cell.strength * cell.count * (options.strength / 100)))
      var color = interpolate(ratio, color0, color1, color2, color3)

      // this is the second interesting part. it just tells the selected brokenarea() slot (bar.series[series[slot.index].id]) to draw the rectangle
      bar.series[series[slot.index].id] ={
        id: cell.id,
        time: time - bar.timeframe,
        lowerValue: cell.top,
        higherValue: cell.bottom,
        extendRight: true,
        color: color
      }

      pendingRedraws.splice(i--, 1)
    } else {
      break;
    }
  }
}
```

This setup provides efficient control over drawing, only updating cells that have changed. With proper configuration, this approach forms the basis for heatmap visualizations by selectively redrawing areas as needed.

### Horizontal lines

The `brokenarea` function can also create horizontal lines, offering programmable and efficient rendering. Setting `lowerValue` and `higherValue` to the same value draws a line instead of a rectangle.

Example: Drawing a horizontal threshold line above a histogram series.

```ts
threshold = option(default=1000000,type=range,step=10000,min=1000,max=10000000)
brokenarea(infinite=true,strokeWidth=0.5,strokeColor=options.upColor,id=threshold)

if (bar.length === 1) {
  // draw once
  bar.series.threshold = { time: time, lowerValue: options.threshold, higherValue: options.threshold, extendRight: true }
}
```

With `brokenarea`, precise control over plot boundaries and appearance is possible, enabling a high degree of customization across various charting applications.
