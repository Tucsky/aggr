```ts
cbuy: number
```

Represents the sum of all the individuals buy / long market orders in the current bar.
It's the count, not the volume.
> Disabling a market in the chart filter UI will affect this amount


```ts
histogram(cbuy, title='buy count')
```