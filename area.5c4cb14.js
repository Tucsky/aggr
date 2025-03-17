const e="```ts\narea(\n  value: number | { \n    value: number, \n    time: number \n  },\n  [options]\n)\n```\n\nRenders an area series for the current bar using the specified value and optional styling parameters. This function adapts the `addAreaSeries` method from Lightweight Charts for individual bar rendering.\n\n## Parameters\n\n- `value`: The value for the current bar, either a number or an object with `value` and `time` properties.\n- `options` (optional): A set of styling options for the area series. Options include:\n  - `lineColor`: The color of the line in the area series (e.g., `lineColor=yellow`).\n  - `topColor`: The color at the top of the area series (e.g., `topColor='#2962FF'`).\n  - `bottomColor`: The color at the bottom of the area series (e.g., `bottomColor='rgba(41, 98, 255, 0.28)'`).\n\n## Returns\n\n- This function does not return a value. It renders the area series on the chart for the current bar.\n\n## Summary\n\nThe `area` function is designed for real-time, bar-by-bar rendering of area series in charts. It accepts a value for the current bar and a series of optional styling parameters, allowing for customization of the series appearance. The parameters follow a key=value format, making it flexible and intuitive to specify various options. This function is ideal for applications requiring dynamic and visually distinct data visualization, particularly in financial or data-intensive contexts.\n\n*Note: All options are optional. The function can be used with just the `value` parameter (e.g., `area(1)`), in which case default styles will be applied. The styling parameters must be valid CSS color values for the function to render the series correctly.*\n";export{e as default};
