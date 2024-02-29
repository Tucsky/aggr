`options`

An object that contains all the settings and options used in the indicator script.

## Usage

- `options.yourOptionName`: By adding this line in the script, the corresponding option will automatically be integrated into the indicator's settings UI (under the options tab).

## Best Practices

While it's possible to directly add options to the `options` object, it's recommended to define these options within the script using the `option()` function. This approach provides more control, allowing you to specify input types, set default values, provide help text, and more. For detailed guidance on defining options, refer to the documentation for `option()`.
