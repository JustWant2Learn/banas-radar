declare module "@mapbox/polylabel" {
  export default function polylabel(
    polygon: readonly (readonly (readonly number[])[])[],
    precision?: number,
  ): [number, number];
}
