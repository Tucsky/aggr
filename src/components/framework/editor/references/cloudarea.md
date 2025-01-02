```ts
cloudarea(
  lowerValue: number,
  higherValue: number,
  [options]
)
```

Exemple:

```ts
cloudarea($price.low, $price.high, positiveColor=green, negativeColor=red)
```

Draw continuous cloud (shape with a top and a bottom value) 

```ts
export interface CloudAreaStyleOptions {
	positiveColor: string;
	negativeColor: string;
	higherLineColor: string;
	higherLineStyle: LineStyle;
	higherLineWidth: LineWidth;
	higherLineType: LineType;
	lowerLineColor: string;
	lowerLineStyle: LineStyle;
	lowerLineWidth: LineWidth;
	lowerLineType: LineType;
	crosshairMarkerVisible: boolean;
	crosshairMarkerRadius: number;
	crosshairMarkerBorderColor: string;
	crosshairMarkerBackgroundColor: string;
}
```

***Note: all of these options are static, aka remains the same for the whole series***