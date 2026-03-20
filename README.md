# AX mapping tool

https://ezmac.github.io/ax-mapper/

Allows a user to place cone symbols on either blank canvas or uploaded map.  Output in json or PNG.

Hidden keys:
Left/Right: rotate a symbols
Up/Down: Wide/Narrow for gates, slaloms.
Hold SHIFT to get fine control.

# Scale:
Either scale measurement tool or via Ground Control Points.

Output will be in json format.

## GCPs:
When I add cones to blender, I match 3 GCPs in the 2d template to 3 known points in the 3d scene.  This handles scaling and position. This exports them in order but has no other way to identify them.

This is alpha but working for my export format.

TODO:
 - naming
 - localstorage cache

