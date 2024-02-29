```ts
csell: number
```

Represents the sum of all the individuals sell / short market orders in the current bar.
It's the count, not the volume.
> Disabling a market in the chart filter UI will affect this amount


```ts
histogram(csell, title='sell count')
```