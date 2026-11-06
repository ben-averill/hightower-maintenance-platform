# 3D architecture

## Hierarchy

Scene → lighting / stage / bike → category → slot group → primitive meshes.
Categories are frame, suspension, wheels, brakes, drivetrain and cockpit. Slots cover frame; fork/shock; front/rear wheels; front/rear brakes; crank/chainring/chain/cassette/derailleur; handlebar/stem/grips/dropper/saddle.

## Binding contract

The procedural asset owns a manifest of node keys, slot IDs and primitive descriptions. The manifest is rendering data, separate from the domain seed. Mesh names are useful for debugging only. Each SlotObject receives a stable slotId, resolved active instance ID, presentation state, and selection callback. Raycast picks bubble to that group and stop propagation; the group sends its explicit slot ID to the app. A replacement changes the resolved instance without requiring geometry changes. Multiple meshes can therefore address the same fork instance.

## Selection and isolation

HTML selectors and mesh clicks share one selection state. Assembly selection clears the individual selection and focuses all slots in the category. A component selection highlights its full group and opens its instance panel. Focus fades other groups; isolated mode omits their geometry. Faded groups do not intercept picks. Whole-bike selection restores every group. OrbitControls supports rotate, pan and zoom with bounded distance; Reset view restores a known camera. HTML component buttons are the accessible selection alternative.

## Presentation states and future animation

Scene-only presentation modes are default, selected, isolated, exploded and hidden. A transform target contains position, rotation, scale, opacity and visibility; the current slice uses default poses plus selected emissive color and isolation/fade. Category explode offsets can later animate toward a target without modifying domain coordinates or instance records. Do not encode product state in transforms. Honor reduced motion when camera/pose animations are introduced. The current view uses immediate transitions.

## Maintenance visualization

App calculates statuses, passes a slot-to-status map, and scene maps those values to a small palette. Unknown is gray, Good green, Approaching amber, Due orange, Overdue red. Selected outline/emission and panel text provide context. A visible HTML legend describes colors; color is not the only way to inspect status. Default manufacturer mode remains Unknown until evidence exists; demo mode is labeled in the viewport and panel.

## Production GLB replacement

Prefer GLTF/GLB. Preserve app/domain contracts and replace only the geometry provider. Create a versioned manifest mapping asset node identifiers (or GLTF extras) to stable slots; validate that required slots exist, every selectable mesh resolves once, and no mesh is accidentally shared across components. Clone mutable materials before changing highlights. Normalize asset scale/orientation in the loader and retain a default pose table for reversible isolation/explode. Use lazy loading, disposal, mesh budgets and compression once the real asset exists. Do not add a speculative GLB loader in this slice.

## Scope and limitations

### Photo-informed visual revision

The supplied reference photographs now guide the silhouette and appearance: a sloping top tube, curved and tapered downtube, low horizontal shock with a piggyback reservoir, suspension links and pivots, fork arch, treaded tires, crossed spokes, rotor arms, cassette teeth, chain links, shaped cockpit and saddle, and reference branding. The teal paint and lime lettering are visual estimates from the photos. Tire branding and part detailing are appearance references only; they do not populate unverified catalog specifications.

`model.ts` remains the slot-binding manifest. `primitives.ts` defines rendering-only shapes. `ModelPrimitive.tsx` renders tapered cylinders and variable-section curved sweeps; tread blocks, cog teeth and chain links use instancing to avoid a draw call per repeated detail. Lettering uses local canvas textures with no remote font or image dependency. Selection and isolation operate on the same stable slot IDs as before. Geometry and generated textures are disposed when their rendering components unmount.

This is a more detailed procedural approximation, not a scanned or dimensionally validated model. Exact frame junctions, suspension kinematics, tire profiles and component internals still require a licensed detailed GLB/CAD asset or measured reference modeling. No maintenance rules or physical component records are inferred from the visual mesh.

All proportions, cross sections, paint and part details remain visual estimates, not measured Hightower geometry or evidence of compatibility or suspension kinematics. No remote textures, fonts, environment maps or assets are needed. DPR is capped. WebGL failure preserves the HTML flow; visual geometry is deliberately not unit-tested. Domain calculations and replacement are tested independently.

## Official reference review — 2026-10-01

Reviewed the [Hightower 4 MY25 support page](https://www.santacruzbicycles.com/pages/product-support/hightower-4-my25), its six exploded drawings, and the user's Medium geometry screenshot. The drawings are assembly references without dimensioned pivot coordinates. No downloadable CAD or GLB asset was found on that page. Local PNG copies are retained in `artifacts/references/` for reference only and are not loaded by the app.

### Medium geometry supplied by the user

Lengths are millimeters; angles are degrees. The actual bike's Hi/Lo setting remains unconfirmed. Preserve both settings.

| Measurement | Hi | Lo |
| --- | ---: | ---: |
| Reach | 460 | 457 |
| Stack | 632 | 634 |
| Head tube angle | 64.2° | 63.9° |
| Head tube length | 120 | 120 |
| Rear center | 436 | 436 |
| Front center | 800 | 800 |
| BB height | 344 | 341 |
| BB drop, front | 29 | 32 |
| BB drop, rear | 29 | 32 |
| Wheelbase | 1237 | 1237 |
| Top tube length | 595 | 595 |
| Seat tube length | 405 | 405 |
| Seat tube angle | 77.9° | 77.6° |
| Standover height | 723 | 723 |

The published figures are rounded: front and rear center sum to 1236 mm while wheelbase is 1237 mm. Retain the source values and accommodate rounding when reconstructing anchors. Effective seat angle and top tube length should not be treated as literal angles or spans of the sculpted frame tubes.

### Current procedural model comparison

For diagnosis, normalize the current 2.26 scene-unit wheelbase to 1237 mm (547.345 mm per scene unit). Using the existing rear/front axle, bottom bracket, and head tube control points in `src/scene/model.ts` gives:

| Measurement | Current model estimate | Medium reference, Hi / Lo |
| --- | ---: | ---: |
| Reach | 542 mm | 460 / 457 mm |
| Stack | 602 mm | 632 / 634 mm |
| Head tube angle | 70.8° | 64.2° / 63.9° |
| BB drop | 46.5 mm | 29 / 32 mm |

These are measurements of procedural control points, not measurements of a manufactured frame. They show why cosmetic details alone have not resolved the silhouette: the head tube is too far forward relative to the bottom bracket, stack is low, steering is too steep, and the bottom bracket sits too far below the axles. Fork and steerer geometry also need a consistent common axis.

### Exploded drawing observations

Each numbered filename below is also saved under `artifacts/references/`.

1. [Frame and protection](https://www.santacruzbicycles.com/cdn/shop/files/hightower_4_exploded_1.png?v=1730851626&width=2500): useful views of molded tube junctions, the sculpted bottom bracket/shock tunnel, downtube guards, badge, and seat collar. The current circular sweeps only approximate these changing cross sections.
2. [Pivot and shock hardware](https://www.santacruzbicycles.com/cdn/shop/files/hightower_4_exploded_2.png?v=1730851628&width=2500): distinguishes link pivots, shock mounts, and flip-chip hardware. Exploded fastener directions are useful assembly references; the drawing does not establish exact pivot locations.
3. [Rear triangle and protection](https://www.santacruzbicycles.com/cdn/shop/files/hightower_4_exploded_3.png?v=1730851627&width=2500): shows rear axle/hanger hardware, bracing, ribbed chainstay protection, seatstay guards, and lower-link fender. Hanger compatibility does not establish the installed drivetrain attachment.
4. [Glovebox](https://www.santacruzbicycles.com/cdn/shop/files/hightower_4_exploded_4.png?v=1730851628&width=2500): shows the opening on the inward-facing downtube surface, lid, bezel, and retaining hardware as distinct pieces.
5. [Lower link](https://www.santacruzbicycles.com/cdn/shop/files/hightower_4_exploded_5.png?v=1730851626&width=2500): a shaped, webbed body with bearing seats and forked shock attachment. Model this as one coherent link assembly rather than approximating its silhouette with independent round rods.
6. [Upper link](https://www.santacruzbicycles.com/cdn/shop/files/hightower_4_exploded_6.png?v=1730851625&width=2500): a bridged, hollowed yoke with two pivot axes and separate bearing/shield hardware. Its shape and width matter in three-quarter views.

The upper-link drawing includes callout F beyond the adjacent A–E web table; the glovebox drawing includes E beyond the adjacent A–D table. Resolve these discrepancies before any parts-catalog import. No torque values, service intervals, or installed-component facts were imported by this review.

### Next modeling pass

Reconstruct primary anchors in millimeters, using the bottom bracket as origin, followed by axle positions, head tube endpoints, steering axis, fork offset, and cockpit. The support page specifies 29-inch wheels, 160 mm fork travel, 44 mm fork offset, 150 mm rear travel, and a 230 × 57.5 mm shock; use these as envelope constraints, not a complete suspension model. Fit the frame surfaces to the photos only after the anchors agree with the selected geometry setting.

Represent the front triangle, rear triangle, upper link, lower link, and shock hardware as separate visual assemblies while retaining existing stable maintenance slot bindings. An exploded drawing alone cannot validate suspension kinematics or hidden dimensions. New assets should identify generation, frame size, units, and usage rights. GLB/glTF is easiest to render; Blender or STEP/STP/IGES sources can support an asset preparation workflow. Dimensioned orthographic drawings are useful if a 3D source is unavailable.

This review changes documentation and saves reference images; it does not claim the runtime model has been dimensionally corrected.

## Dimension-based revision — 2026-10-01

The runtime model now uses millimeter coordinates, converted at the rendering boundary by `sceneScale = 1 / 550`. `src/scene/geometry.ts` separates published Medium/Low and Medium/High anchors from the estimated surfaces in `model.ts`. Low is the preview assumption, clearly labeled in the viewport; it does not establish the owner's actual flip-chip setting.

Reach, stack, head tube length/angle, bottom bracket height/drop, wheelbase and chainstay length now constrain the layout. Nominal wheel radius is derived as BB height + BB drop (373 mm), rather than treating the 29-inch wheel designation as an exact tire outside diameter. Axles share a height. Fork offset is 44 mm; the constructed leg axis agrees with the steering axis within the source constraints' small residual. The model also uses 148 mm rear hub spacing, a 12 mm rear axle, 110 mm front hub spacing, 73 mm BB shell width, a 31.6 mm post, 230 mm shock eye spacing and the supplied mounting widths/bolt diameters. These are visual reference dimensions, not verified installed components.

The wheelbase and diagonal chainstay length take priority in anchor construction. Their implied diagonal front center is 802.81 mm in Low and 802.49 mm in High, compared with the listed 800 mm. This is an unresolved source/convention/rounding discrepancy, not a claim that every published figure has been satisfied exactly. Tests preserve this bounded residual. Headset interface diameters do not define the external head-tube shape; suspension travel does not establish pivot coordinates, fork axle-to-crown length or a motion model.

### Additional user-supplied standards and discrepancies

The following distinctions were retained after checking the [official MY25 support page](https://www.santacruzbicycles.com/pages/product-support/hightower-4-my25):

- Maximum rear rotor: the supplied list says 203 mm; the official page says **223 mm**. Neither is the installed rotor size. The visual GX AXS reference uses 180 mm rotors.
- High rear/front center: the supplied list says 435/799 mm; the official Medium chart shows **436/800 mm**, without separate High/Low values. The new anchor code retains 436 mm and the published wheelbase, with the residual above.
- Seat angle: the supplied list calls 77.6°/77.9° “actual”; the official table does not establish that interpretation. Keep these as listed geometry angles and do not force the curved seat tube or post axis to that angle. Physical seat-tube contours and saddle height remain estimated.
- Detailed headset codes IS41/28.6 and IS52/40: user-supplied detail; the page identifies only IS41/52. Do not infer external tube diameters from these interfaces.
- Chainline 55 mm (MTB Wide): retained as a user-supplied visual reference. Independent exact chainline verification remains pending.
- ISCG-05 / three-bolt tabs: user-supplied and unverified in this review; no tab geometry or compatibility claim was added.
- UDH: appears in the official exploded rear hardware reference. Hanger compatibility and the installed T-Type derailleur mounting arrangement are separate facts.
- Rear post mount 180 mm, tire clearance 2.5 inches, collar 36.4 mm, fork/rear travel 160/150 mm and shock/mount dimensions agree with the model reference. They do not imply exact outer part profiles.

Upper/lower link bridges, rear-triangle spacing, shock mounting hardware, drivetrain scale, cockpit width and wheel detail were adjusted around the new anchors. Frame curvature, pivot coordinates, saddle/dropper extension, glovebox shape and hardware exteriors remain approximations. No maintenance rules or installed-bike records were updated. Validation comprises the production build, existing domain tests, six dimensional anchor tests, and browser visual inspection.

## Full-viewport workbench

The canvas fills `100dvh` with no surrounding page margins or scrolling. Identity, scene tools and the assembly dock float above it. Components expand from the dock; choosing a component collapses the picker and opens a scrollable detail overlay. Details can be closed with its close button or Escape; keyboard focus returns to the Details toggle. Opening the picker closes the detail overlay to avoid overlapping controls. Hide controls removes overlays while retaining a Show controls button and preserving panel state. Mock service controls remain available inside Details. The camera fits by viewport aspect ratio, with an adaptive orbit distance limit for narrow screens.

Verified desktop and phone canvas/page dimensions, show/hide, component selection, picker/detail coordination and Escape focus restoration in the browser. Existing domain and geometry tests are unchanged.

## Sculpted frame revision from user photographs

The new nine-image reference set includes an exploded render the user identifies as **2022**. That image is an assembly/construction reference only; its geometry, pivot positions, color and dimensions do not override the Hightower 4 MY25 anchors. It is saved as `user-2022-exploded-reference-only.jpg`. The six previously downloaded MY25 support drawings remain separate references.

`frameGeometry.ts` hand-traces the supplied green frame-only silhouette and registers its bottom bracket, rear axle and head reference to the existing MY25 Medium/Low layout. The other green frame photos guide the lower window, junctions, rear triangle and guards; the linkage close-ups guide the shock pocket. The frame size and camera calibration of these photographs are not established, so this is a visual reconstruction with estimated hidden geometry, not a calibrated scan or CAD model. The 405 mm seat anchor overrides the photo's apparent collar location.

The front frame is now a continuous profile mesh with a main opening, a real triangular through-window above the BB, rounded edges and variable cross-sections. Interior face tessellation supports curved surfaces instead of flat slabs. Both sides of the rear triangle use shaped profiles that taper laterally toward the linkage. The upper links have open slots, the lower linkage sits within the frame pocket, and the shock mounts retain 230 mm eye spacing after repositioning. A transverse shaped fork arch replaces the projecting sweep. The chainstay protector and ribs follow the rebuilt stay.

`profileGeometry.ts` constructs and disposes the profile geometry. A local procedural room environment supplies paint reflections without remote assets. Slot IDs, full-viewport overlays and maintenance records remain unchanged. Exact carbon layup surfaces, concealed hardware, fit, suspension motion, and photo-to-model dimensional agreement are not verified. Photographed purple builds and the older exploded render do not change the seeded build specification.

Reference images are preserved under `artifacts/references/user-*` and are not served as app textures. Validation includes a production build, domain/anchor tests, ray tests through both frame openings from both sides, finite/bounded profile geometry checks, the shock eye-spacing check, and visual inspection of both sides in the browser.

## Fork and cockpit reference pass — 2026-10-01

The owner supplied four fork/cockpit photographs and specified a **760 mm handlebar cut down from 800 mm**. `data/bikeSetup.ts` holds that measured width; the initial handlebar instance records the cut with user-provided provenance and displays it in Details. The same width sets the model's bar endpoints and positions the grips. Mock installation/service history remains mock. A replacement instance does not inherit that physical modification.

`scene/frontAssembly.ts` builds the connected assembly in millimeters: a tapered steerer continues from the fork crown through the head tube into a hollow stem clamp. Headset covers/spacers follow the same steering axis. Two crown branches join the stanchion tops; 36 mm stanchions, dust seals, tapered lowers, dropout/axle details and a shaped tire bridge form the fork. The stem has a distinct handlebar clamp, faceplate, four faceplate bolts and top cap. The bar has a circular tapered section, rise and sweep, with 125 mm estimated grips ending at the 760 mm cut ends. Brake clamps, reservoir bodies, curved lever blades and hoses connect at common anchors. Brake-to-lever handedness is a visualization assumption, not verified owner setup.

Only bar width is newly measured. Stem reach (42 mm forward in the construction coordinates), spacer stack, bar rise/backsweep, grip length, crown contours, exterior clamp shapes, hose routes and control angles remain visual estimates. Fork axle position and the MY25 Medium/Low head anchors are retained. The 30 mm visual stanchion-seat shift and exposed stanchion length do not establish verified axle-to-crown dimensions, sag or suspension kinematics. Gold-stanchion photos are shape references; the seeded Performance Elite fork stays black.

The Front assembly camera button clears selection/isolation and frames the upper fork and cockpit. Reset view returns to the whole-bike camera. The regular orbit, component selection, service colors and overlay toggles remain available. Hollow sleeves are rendered with axis-aligned lathe geometry, scaled only at the scene boundary. Reference photos are preserved under `artifacts/references/user-front-*`, `user-handlebar-front-reference.png` and `user-fork-stem-side-reference.png`.

Validation: production build; 56 domain/geometry tests including the measured bar width, steerer continuity/alignment, crown-to-leg connections, hose origins and clamp scaling; browser inspection of the close view, whole-bike view and handlebar setup detail.

### Compact fork crown correction

The owner's side-by-side close-ups showed excessive forward projection below the head tube. The earlier construction placed the full nominal fork offset at the crown and added a 30 mm downward shift, producing an extended bridge. `frontAssembly.ts` now uses a compact, estimated 12 mm crown offset and a 12 mm seat drop. Both leg axes remain exactly parallel to the steerer; the remaining axle offset is carried by shaped dropout lugs instead of tilting the legs. The front axle, wheelbase, steering head, and 760 mm cockpit are unchanged. The fork bridge and decals follow the corrected leg positions. The crown/dropout split is a visual reconstruction from the photographs, not a verified FOX drawing.

Validation: production build and 57 tests pass, including a new constraint on crown projection, leg-axis parallelism and dropout connections to the original axle. Browser inspection from front-quarter and side angles confirms the crown is tucked under the head tube. Proof: `artifacts/compact-fork-crown.png`.

## Final side-profile refinement — 2026-10-01

The owner supplied a model/bike comparison and a larger complete-bike side photograph. The new main-frame and rear-triangle contours are traced from that complete-bike view, using coordinates normalized to the displayed 1856 x 1342 image. The trace registers rear axle, BB and head to the existing MY25 Medium/Low anchors; the seat collar still uses the 405 mm seat anchor. This supersedes the earlier frame-only silhouette trace. The original latest image is saved as `artifacts/references/user-complete-bike-side-reference.png`.

The changes slim the top tube and rear stays, reshape the lower window and downtube transition, lower the estimated shock mounts by 32 mm while preserving 230 mm eye spacing, and reduce the shock body's visual bulk. A more swept-back estimated post axis and 320 mm visible post extension support a shaped saddle with a tapered nose and curved side profile. These are photo-matching estimates, not recorded rider-fit measurements. The owner's measured 760 mm bar, compact fork crown, head geometry and axle locations remain unchanged. The photographed fork/crank differ from the seeded build, so the reference does not replace component identities or service rules.

Wheel tread now has five staggered rows with exposed intermediate blocks, finer spokes and revised sidewall label placement. Toothed cassette/chainring profiles and perforated rotor profiles replace simple circular rails. The derailleur cage is shorter and swept rearward; the chain follows its updated pulleys. Pedals have open platforms, the chainstay protector follows the stay as a shaped plate, and an estimated rear hose crosses the frame opening. Brighter lettering and darker teal paint accompany reduced clearcoat/camber to limit the earlier uneven surface highlights. This remains a procedural approximation, not a scan or manufacturer CAD asset.

Profile subdivision is bounded relative to both thickness and bevel to avoid over-tessellating the thinner rear shells. Ray tests were moved to the corresponding open-frame/window and solid-downtube points in the new trace. Production build and all 57 tests pass, including mesh budgets, finite geometry, opening raycasts, measured bar width, shock length and compact fork/axle constraints. The final side view was inspected in the browser; proof is `artifacts/final-side-profile.png`.

## Maven brake reference pass — 2026-10-02

The owner's rear brake close-up (`artifacts/references/user-maven-brake-reference.png`) guides the shared front/rear hardware in `scene/brakeGeometry.ts`. Both ends now use a two-piece silver-gray casting, a recessed Maven face, four main socket bolts, a small center fastener, copper-colored pads, bridges, mounting ears and hose inlets. A continuous steel rotor track has diagonal cooling slots, six curved spider windows and six mounting fasteners. The existing 180 mm rotor envelope is retained; the photograph does not establish exact hidden dimensions or override installed-component identities.

The front caliper sits behind the fork lower; the rear caliper sits above and forward of its axle. Supports and hose routes are estimated visual geometry. Front and rear close-up options in the floating toolbar view the brake side and preserve orbit controls. Reset view restores the complete bike. No maintenance rules or service records changed.

The prior rounded-frame surface work was stabilized by indexing nearest-edge lookups in a bounding-volume hierarchy. This removes the geometry test timeout without changing the distance calculation or redesigning the frame during this brake pass.

Validation: production build; 63 passing tests, including rays through rotor cooling slots, spider windows and mounting holes from both sides, solid track/spider checks, caliper/pad clearance and the front hose endpoint. Both brake views were inspected in the browser. Proof images: `artifacts/rear-brake-detail.png` and `artifacts/front-brake-detail.png`. The hardware remains a photo-based reconstruction, not manufacturer CAD.

### Brake placement correction

The two additional owner photos show a nearly level rear body and an upright front body tight behind the fork. Caliper orientation is now independent of its location around the rotor: the rear body has a four-degree pitch, while the front body's long axis is vertical. Rear support bases follow the traced upper seatstay shoulder, producing a short forward platform and a taller dropout-side post. Front mounting connections are shortened and the body sits closer to the fork. Rotor geometry and axle positions are unchanged. Exterior mount shapes and positions remain visual estimates.

Validation: production build, 65 passing tests (including orientation, rear support-height difference and compact front connections), and browser inspection of both close-up views. References are saved as `user-rear-brake-placement.png` and `user-front-brake-placement.png`; proof is in `artifacts/rear-brake-placement.png` and `artifacts/front-brake-placement.png`.

### Caliper scale and fork-post refinement

The owner requested both calipers be reduced by 25% and supplied a clearer front mounting photo. `caliperScale = 0.75` scales each casting, face, label, bolt, pad and mounting ear about its local center; the 180 mm rotors and wheel/axle geometry retain their dimensions. Hose endpoints and supports follow the smaller bodies. The rear remains nearly level with unequal support heights.

The latest front photo supersedes the strictly vertical interpretation: the front body's long axis now follows the actual fork axis. Two black mounting posts connect the lower to a separate narrow adapter behind the caliper. Post bases derive from the same crown/leg axis used by the fork; the adapter and hidden attachment surfaces remain photo-based estimates. Reference: `artifacts/references/user-front-brake-posts.png`.

Validation: production build and 67 tests pass, including exact 25% casting-size reduction, unchanged rotor thickness, fork-axis alignment, compact mounting connections and rotor/pad clearance. Both brake close-ups were visually inspected. Proof: `artifacts/front-brake-scaled-mounts.png` and `artifacts/rear-brake-scaled-mounts.png`.

### Left-side rear brake hose

At the owner's direction, the exposed rear hose now stays on negative Z (the left/non-drive side), from the downtube exit through the suspension loop and seatstay to the rear caliper inlet. `rearFrameBrakeHose()` replaces the previously separate right-side frame loop and left-side caliper tail with one connected sweep. The cockpit hose approaches the head-tube entry on the left; lever handedness remains unchanged. The concealed internal frame route is not rendered. Production build and all 68 tests pass, including left-side routing and exact caliper-inlet termination. Browser proof: `artifacts/left-rear-brake-hose.png`.

## FOX 36 Performance Elite GRIP X visual pass

The owner supplied the black fork image (`artifacts/references/user-fox36-gripx-black.png`) and the [2025 Vital MTB product page](https://www.vitalmtb.com/product/guide/forks/fox/36-performance-elite-grip-x-2025-50536). The page lists black anodized 36 mm stanchions, matte-black lowers, 150/160 mm travel options, 15 x 110 Boost, 44 mm offset, lower bleeders and a Kabolt X floating axle with a single-sided pinch bolt. The existing bike remains modeled around its 160 mm setup; product options do not establish a new installed serial number or service specification. FOX's legacy matching product URL returned 404 during this review.

The visual pass reshapes the arch with a broad curved casting and tapered supporting shoulders, separates dust seals from the glossy stanchions, and adds blue knurled top controls, lower bleeders, an air-side sag ring, bottom hardware, axle caps and a single pinch-bolt detail. Crown branches are fuller while retaining the previously corrected compact projection. Larger FOX, 36 and GRIP X decals face the front quarters of the legs; a label basis and fitted text option support these without changing existing frame/brake lettering. The front-assembly camera now includes the lower fork. Isolated components retain their material colors instead of the green selection tint.

Exterior castings, decals, axial control positions and hidden surfaces remain reconstructed estimates. The arch and dropout work retain axle, head and bar anchors and the current brake mounts. The static exposed stanchion distance is 160 mm between the modeled crown sleeve and dust seal; this does not simulate suspension compression or validate axle-to-crown specifications.

Validation: production build and 70 tests, including 36 mm stanchions, exposed length, ray checks through the arch opening and its solid top, and prior crown/axle/hose/brake constraints. Browser inspection covers the assembled front end and isolated fork. Proof: `artifacts/fox36-gripx-refinement.png`.

### Wrapped decals, raised controls, and bowed arch refinement

The owner's detailed close-ups and flat decal kit supersede the plain-text decals above. `forkDecal.ts` reconstructs angular 36 graphics, diagonal gray bands, block-serif FOX lettering, an attached tail flourish and small Performance Elite markings on a tapered cylindrical skin. The upper graphic is 36, not GRIP X. U coordinates now run in the correct direction when viewed from outside the fork, fixing mirrored lettering. The O has a closed outer loop and inner counter. Artwork is a hand-drawn approximation of the reference, not an official manufacturer asset.

The blue controls sit above the crown sleeves with separate washers, notched outer rings, smaller center controls and an index mark. The wheel arch is now a continuous three-dimensional bowed casting: its top sweeps forward from the lower-leg shoulders, and raised lips border a recessed front face. Paired tapered reinforcing fins connect each shoulder to its lower; the left hose-guide boss follows the reshaped shoulder. Axles, steering geometry, brakes and owner-measured bar width retain their previous anchors.

Verification includes production compilation and geometry checks for outward decal orientation, the arch's clear opening and solid faces from both sides, its forward bow, and controls above the crown sleeves. Browser verification of this latest pass is pending: automatic approval review could not execute the browser check because the workspace was out of credits. The earlier proof image above does not represent this latest revision.

### Arch inclination correction

The owner's side-by-side reference shows that the wheel arch should follow the inclined fork more closely. The arch now uses the fork's up/forward coordinate basis instead of world vertical. Its forward bow is reduced from 32 to 14 mm while retaining the raised lips and recessed face. Shoulder fins and the hose-guide boss use the same basis so they follow the casting. The lower-leg attachment centers remain in place. Production build and all 73 tests pass, including the updated fork-relative inclination constraint and opening/solid-surface ray checks. Visual browser verification remains unavailable following the workspace credit-related approval-service failure.

The next owner comparison requested an intermediate arch position. Its upper center is now approximately halfway between the earlier world-upright flare and the close fork-aligned revision. Fork-local rise/bow are 62/37 mm; this keeps the top at nearly the same world height while moving it about 25 mm outward from the close revision. Base attachments remain fixed, and fins/guide follow the shared bow function. Production build and all 73 tests pass. This is a photo-based adjustment; browser visual verification remains pending.

## FLOAT X rear shock reference pass

The owner's product and installed-bike images guide `rearShock.ts`. The former basic cylinders are replaced with a stepped glossy black air can, enlarged EVOL collar, black exposed shaft and travel ring, tapered front casting, and a separate parallel piggyback reservoir with end plug and connecting neck. The existing 230 mm eye-to-eye anchors and transverse frame mounting locations are retained. Hollow eyelet castings contain contrasting bushings, reducers and mounting pins.

Details include a notched blue compression dial, blue side lever, red rebound dial, and black air-valve cap. `shockDecal.ts` draws approximate FLOAT X, FOX, Performance Elite and EVOL artwork on curved surfaces on both sides. Dimensions and concealed controls are reconstructed estimates; the references do not change installed-component records or maintenance specifications. The fork and frame are unchanged in this pass.

Validation: production build and 76 passing tests. New checks cover retained mounting centers, eyelet orientation, parallel reservoir clearance, outward decal normals, reading direction on both sides, and scene scaling. Browser visual verification remains pending after the workspace-credit approval-service failure; no new rendered proof is claimed.

### FLOAT X decal-sheet refinement

The owner's flat gray-on-black kit and product image supersede the earlier generic lettering. `shockArtwork.ts` provides vector-drawn angular FLOAT X and EVOL lettering, block-serif FOX marks with connected outlined tail details, large broken X motifs, diagonal FLOAT bands and small Performance Elite text. The main air-can pattern uses a near-black background with muted gray graphics; the reservoir has the stacked series/wordmark layout, and the narrow collar has circumferential EVOL / Extra Volume markings. Red center-alignment arrows and other reference-sheet annotations are excluded from the artwork.

Each side now covers half the circumference, giving complete wrap coverage rather than two separated side patches. Texture aspect ratios reflect the main can, reservoir and narrow collar. The shock geometry and mounts are unchanged. This remains a vector reconstruction, not an exact manufacturer decal file. Production build and all 76 tests pass; live visual verification remains pending due to the prior browser approval-service credit failure.

## Minion tire decal pass

The owner specified DHF at the front, DHR at the rear, and MAXXIS opposite each model label. The supplied rear image shows DHR II, so the rendered names are MINION DHF and MINION DHR II. On both tire sidewalls, white outlined model lettering occupies the upper arc and a yellow vector-drawn MAXXIS mark occupies the opposite lower arc. The 3C / Maxx Terra / EXO / TR badges follow the supplied reference artwork; they do not change installed setup or maintenance records, and no size or pressure specification was inferred.

`tireDecal.ts` replaces the earlier flat MINION/MAXXIS boards with curved strips following the wheel arc and toroidal rubber cross-section. Front/back mapping retains readable lettering on both sides. The tire, tread, rim and hub dimensions are unchanged. Production build and 79 tests pass, including front/rear model selection, opposite logo placement, outward normals, full-surface rubber clearance and readable UV direction. Live visual verification remains pending after the prior browser approval-service credit failure.

## Cockpit spacer and Maven Bronze lever pass

The owner requested two more spacers beneath the stem. The existing modeled spacer was 9 mm, so the stack now contains three matching 9 mm spacers with visible edge seams. The stem, top cap, bars, grips and controls move 18 mm along the steerer axis. The concealed steerer is extended to the raised clamp; the 760 mm bar width and fork/frame anchors remain fixed. This is a visual model adjustment, not a newly verified physical setup measurement.

The Maven Bronze product references guide the gray cast lever bodies in `mavenControls.ts`; the installed silver lever photo guides placement. The model uses gray BRZ branding, black reservoir covers, shaped black blades with hooked tips, split-clamp bridge details, pivot and bleed screws, reach-adjuster hardware and tapered hose boots. Both hydraulic routes start at their revised inboard outlets. XZ-plane profile support produces solid horizontal castings without flat rectangular placeholder bodies.

Validation: production build and 81 passing tests, including three-spacer count, cockpit displacement along the steerer, steerer-to-clamp continuity, two-sided casting ray checks and exact hose outlet connections. Live browser verification remains pending following the earlier workspace-credit approval-service failure.

## Lower saddle, GX cranks and Race Face platforms — 2026-10-03

At the owner's request, visible post extension is reduced from 320 to 280 mm along the existing seat axis. This lowers the saddle approximately 38 mm vertically, placing its top near the central handlebar height. The dropper collar stays fixed; the shaft, saddle clamp, rails and saddle move together. This changes visual pose, not a verified saddle-fit measurement.

`crankPedals.ts` replaces cylindrical crank sweeps with shaped gray forged-arm profiles, axle and pedal bores, recessed GX/SRAM face pockets, contrasting pocket rims and spindle hardware. The original opposing pedal-axle locations and chainline are retained. Two black chainring guard sectors follow the crankset product reference. Pedals now have broad black platforms with two real windows, central spindle bodies, bearing-end caps, ten traction pins per face, molded rail ridges and Race Face lettering. Their exterior dimensions are photo-based estimates rather than a claimed pedal-model specification.

Validation: production build and 84 tests pass. New ray checks verify open pedal windows, solid rails and recessed crank faces on both sides; a saddle-height check verifies proximity to the bar center. Live browser visual verification remains pending after the previously reported approval-service credit failure.

### Chainring clearance and pedal detail correction

The owner requested removal of the upper and lower black chainring guards; both guard meshes and their generator are removed. The rendered chainring plane moves outward from Z=55 to Z=70 mm to clear the reconstructed frame/stay while remaining behind the right crank arm. The chain follows this front ring plane and transitions to the existing rear drivetrain plane. This visual clearance offset does not revise the recorded 55 mm chainline reference or installed-bike setup.

Pedals retain their open windows and pin layout, with added thread crests, pin-base washers, spindle seal collars, recessed axle-end hardware, molded side scallops and lips, edge crosshatching and small RF markings. Production build and all 85 tests pass. A new clearance check verifies the chainring lies beyond the nearby frame profile surfaces and inside the crank arm with at least 2 mm clearance, and that the separate guard profiles are absent. Browser visual verification remains pending.

### Pedal top-view profile correction

The owner's perpendicular top reference supersedes the earlier rectangular platform outline. Both pedals now have a broad spindle waist, narrowed rounded toe/heel corners, and mirrored trapezoidal openings that widen toward the central bridge. The spindle cover is lowered beneath the flat bridge. Ten traction pins per face follow the inner opening borders, with eight flush outer hex fittings, diagonal bridge/corner grooves and relocated RF markings. Axle and crank attachment positions remain unchanged.

Production build and 85 tests pass. Existing two-sided window/rail ray checks now also verify the broad axle waist and cut-back corners. Live browser visual verification remains pending.

### Slimmer cranks and reservoir/bar clearance

The owner requested narrower crank arms in the top view and smaller reservoirs that clear the bars. Crank arm lateral thickness is reduced 25% about the existing center planes, including face-pocket depth and hardware offsets. Pedal spacing and platform dimensions stay fixed. Maven cast bodies, covers, markings and reservoir hardware are scaled to 80%, with a 24 mm forward placement offset from the clamp reference. The mounting bridges connect the existing bar clamps to the relocated bodies; hose boots and hose routes share the updated outlet. Lever reach and the grip-facing blade curve are retained from the relocated pivots.

Production build and all 87 tests pass. Geometry checks verify both reservoir bodies and covers have more than 2 mm top-view clearance using a conservative maximum bar radius along the rendered bar curve, along with fixed clamp attachment, connected hose outlets, thinner crank sections, pedal spindle engagement and chainring clearance. Live browser visual verification remains pending after the previously reported approval-service credit failure.

### Rotor reference refinement — 2026-10-03

Both rotors now follow the supplied HS2 image more closely: a scalloped six-ear center opening, six swept spoke sectors with twelve actual windows divided by narrow diagonal steel braces, black brace coatings on both faces, 27 longer swept cooling slots and three round track holes. The perimeter has subtle sixfold reliefs and a more metallic steel finish. Small SRAM/HS2, minimum-thickness and rotation markings follow the outer-facing braces. The existing 180 mm diameter, plate depth, axle planes, bolt circle and caliper positions are retained; the pictured 200 mm rotor does not change the bike's recorded size.

A generated flat geometry preview was inspected at `artifacts/rotor-refinement/profile-check.png`; it is a diagnostic silhouette, without the renderer's rounded corners, lighting or labels. Build and all 89 tests pass. Added two-sided ray checks cover every opening through the rotor and coatings, and confirm that the black diagonal strips overlay solid structural braces. Live in-app visual verification remains pending.

### Drivetrain routing, hub flanges and GX detail — 2026-10-03

The chain is rebuilt around analytic circular wraps and common tangents instead of the previous corner-to-corner block path. It engages the 32-tooth front ring and the actual 32-tooth cassette cog at that cog's Z plane, then follows the opposed upper-pulley wrap and lower-pulley return. Free spans interpolate between the front and rear planes. An even, approximately half-inch-pitch closed link sequence drives three instanced meshes for paired alternating side plates, rollers and pins. Sprocket tooth phase follows a seated chain joint. This is a static visual reconstruction, not a chain-length or transmission setup recommendation.

`drivetrainGeometry.ts` provides tapered teeth, perforations visible outside adjacent cassette cogs, a lockring, a shaped GX upper link, battery and motor housings, inset markings, an open two-sided cage and aligned jockey wheels. Existing forged crank proportions and outboard chainring clearance are preserved. The chainstay protector now has transverse rubber fins and a curved forward lip.

`wheelHardware.ts` separates the hub axle/dropout width from the spoke flange positions. Rear flanges sit at Z=-42/+16 mm, inside the rotor and cassette; front flanges sit at -32/+32 mm. Tangentially crossed spokes land on physical flanges and terminate inside the rim section, with nipples and hub end caps. These are visual estimates, not verified hub specifications.

Production build and the 95-test suite pass. New checks cover tangent continuity, all four wraps, free-span clearance, closure and instance transforms, selected-cog/pulley alignment, spoke/rotor/cassette ordering, rim engagement and clear cassette perforations. The flat diagnostic `artifacts/drivetrain-refinement/profile-check.png` was inspected; it deliberately shows the chain route over the housings and does not represent final depth occlusion, lighting or rounded surfaces. Live in-app visual verification remains pending. A straight-path fast path for unrounded profiles avoids redundant curve tessellation on cassette teeth.

### Focused GX derailleur reference pass — 2026-10-03

The latest close-up supplies the upper casting, battery door, open parallelogram, polygonal clutch cover and lower cage silhouette. Reference coordinates register to the existing axle and both pulley centers; the cage articulates between those fixed anchors without changing the chain route. The rebuilt assembly includes a real upper mounting window and axle bore, recessed GX/SRAM badge, layered battery/latch surfaces, two linkage windows, beveled cover with a subtle geometric eagle marking, red cage-lock annulus, hex-socket fasteners, pulley face rings and an open lower guard with its raised cage spine. The housing's lower edge is trimmed to reveal the upper pulley bolt, and the small cage marking sits on the raised surface.

An initial flat silhouette check is saved under `artifacts/derailleur-refinement/profile-check.png`; it omits text and rounded rendering and predates the final upper-pulley exposure trim. Production build and 97 tests pass. Added checks verify axle/pulley registration, open mount/linkage/cage windows through all profile layers, and visibility of the upper pulley fastener. Live in-app visual verification remains pending.

### PNW Loam Carbon 38 mm / Ergon GA3 cockpit — 2026-10-03

The owner-selected cockpit replaces the generic bar and round ribbed grips. The Loam Carbon shape uses a 38 mm rendered end rise, 10-degree backsweep and 5-degree upsweep, retaining the owner's 760 mm cut width and the existing 35 mm stem clamp. The 35 mm variant is inferred from the retained clamp; sweep angles follow PNW's official product page: https://www.pnwcomponents.com/products/the-loam-carbon-handlebar. Low-contrast diagonal graphics, PNW/Loam markings and center alignment ticks follow the supplied image. Brake controls and hose outlets continue to derive from the updated bar positions.

The black Ergon GA3 grips are continuous mirrored meshes with rearward mini-wings, tapered inboard shoulders, diamond-pattern surface graphics, curved collar lettering, lock screws and contrasting end-cap emblems. Wing dimensions, grip girth and length are photo-based visual estimates; no Small/Large size is recorded. The GA3 product reference is https://www.ergonbike.com/en/product-details.html?a=griffe&anr=42410488&s=ga&w=mountain. Seed product identities and manufacturers now show PNW Components Loam Carbon / Ergon GA3 without changing the owner's cut-width record.

Build and 100 tests pass, including bar rise/sweep/width, mirrored wing direction, finite outward-facing capped grip meshes, product identity and reservoir clearance. A bare-surface diagnostic is saved at `artifacts/cockpit-refinement/grip-surface-check.png`; it omits material textures, collars, end caps and final lighting. Live in-app visual verification remains pending.

### Burgtec Enduro MK3 stem — 2026-10-03

The supplied black Enduro MK3 references replace the generic stem. `burgtecStem.ts` builds an open rear bar cradle, two independent curved front straps with four recessed silver socket bolts, curved BURGTEC face lettering, machined side pockets and engraved-style side badges, rear pinch-bolt ears, a split-line detail and a stepped top cap. Pocket floors sit outside the steerer shell while remaining recessed below the side walls. The existing steerer axis, 35 mm bar fit, bar position and three-spacer stack are retained; an exact stem-length variant is not recorded from the photos. The component list now identifies Burgtec Enduro MK3.

Build and 102 tests pass. New geometric checks confirm the 35 mm bar bore stays clear, the bar remains exposed between the two straps, and the side lettering sits above recessed floors. Existing steerer, spacer, cockpit and brake-clearance checks still pass. Live in-app visual verification remains pending.

### Ergon SMS Comp Men saddle — 2026-10-03

The owner-supplied top, underside and three-quarter references replace the generic saddle with a broad rear support shape, tapered nose, recessed center channel and rounded rectangular relief opening. A tessellated, shaped cover and separate underside shell carry the opening completely through the model. The cover has diagonal traction grooves, subtle SMS Comp Men lettering, rear Ergon text and a nose emblem. Symmetric metallic rails connect rear and nose mounting bosses around the existing seatpost clamp, with rail marks and a recessed underside nose fastener.

The established saddle anchor/seat height is retained; surface proportions are reconstructed from the images without assigning an unconfirmed S/M or M/L size. The component record now identifies Ergon SMS Comp Men. `profileGeometry.refineCaps` is shared with the saddle to provide enough surface triangles for the channel and crown without filling the relief hole.

Build and all 104 tests pass. Two-sided ray checks verify the hole is open through the padding and shell, the rear support is solid and the nose is narrow; additional checks cover center-channel depth, symmetric rails, finite normals and the retained height near the bar center. An untextured top-surface diagnostic was inspected at `artifacts/saddle-refinement/surface-check.png`. Live in-app visual verification remains pending.

### Saddle depth, 50 mm bars and OneUp dropper — 2026-10-03

The additional saddle side-view reference informs a raised rear crown, thicker rear padding, lower waist, domed nose and broad rolled edges. Independent cover and shell height fields maintain padding around the relief channel; the underside shell is inset below the cover. Denser cap tessellation and softer cover reflections make the curvature visible, with the existing texture also providing shallow bump detail. The saddle mounting anchor and rails are retained. A geometry regression checks rear padding thickness, rear-to-waist height and shoulder roll by raycasting, alongside the existing relief-hole and saddle-height checks. `artifacts/saddle-refinement/depth-check.png` is an untextured offline three-quarter/side diagnostic, not the final app renderer.

The owner-selected PNW rise is now 50 mm, with geometry and component metadata sharing `loamCarbon.riseMm`. The 760 mm cut width, sweep angles and stem center stay fixed; grips, brakes and hose outlets follow the raised outer bar sections. Cassette cogs, ramp lands and lockring use only black and dark gray, replacing all light gray cassette finishes while retaining the separate chain and rotor materials.

The OneUp V3 reference supplies a black polished upper shaft, stepped seal collar, compact rail cradle, two clamp bridges and bolt details. These are visual refinements at the existing extension and saddle anchor; no travel length is inferred from the reference photo. The component list now identifies OneUp V3 Dropper. The control reference images are retained as context; this pass does not add new remote/pod assemblies.

Production build and all 105 tests pass, including updated 50 mm rise and existing brake clearance checks. Live in-app visual verification remains pending.

### Continuous handlebar and under-grip controls — 2026-10-03

The segmented bar appearance came from the sweep renderer switching its reference axis when a tangent crossed a Z-angle threshold. `sweptGeometry.ts` now transports circular sections continuously along the curve, smooths radius transitions, uses 32 radial segments and averages seam normals. Circular rails and cables share the correction; noncircular sweeps retain their established orientation unless they explicitly opt into smooth transport. The Maven blades opt in and use an outward axis derived from the bar's backsweep and upsweep. Their finger-contact spans are parallel to the grips in 3D, retaining the curved root and hooked tips. The 50 mm rise, cut width and reservoir placements remain unchanged.

`thumbControls.ts` adds a left OneUp remote with an inset ribbed paddle, pivot hardware, barrel adjuster and cable to the frame entry, plus a right SRAM GX AXS two-button Pod with a layered body, divider, rubber pads, nested ribs and pivot cover. Their clamps sit just inboard of the brake clamps, with control faces below and behind the grips, clear of the GA3 palm wings. Dimensions are visual estimates from the owner-supplied references. Oriented profile bases allow the pads to face the rider without changing the shared profile extrusion behavior. Each control has its own component record and selectable model binding (`cockpit.dropper-remote` and `drivetrain.shifter`).

Build and all 108 tests pass. Added checks cover circular section shape, adjacent-ring continuity, seam normals, 3D lever/grip parallelism, under-grip clearance and solid button faces. The untextured CPU shape diagnostic `artifacts/cockpit-refinement/controls-check.png` was inspected; it omits decals, bump textures and final lighting, and predates the final small clamp-position adjustment. Live in-app visual verification remains pending.

### Theme, tire tread and finishing pass — 2026-10-05

The interface now offers System, Light and Dark themes, remembers the preference in local storage and follows system changes when System is selected. Dark mode changes the panels, controls, status colors, form surfaces and 3D studio background/grid while retaining the bike materials. The mountain mark has been removed from the header. Both themes and preference persistence were checked in the live in-app browser; the theme selector and toolbar also fit within a 375 px viewport.

The OneUp remote and GX AXS pod bodies, pads, markings and small hardware are reduced to 80% around their existing mounting centers. Bar clamp dimensions remain sized to the handlebar. The saddle has roughly 4 mm more rear padding through a slightly higher crown and lower underside, preserving its anchor, rails, relief opening and rounded edges.

Rotor planes move to Z=-39 mm (front) and -50 mm (rear), with calipers and hose endpoints following the shared brake pose. Ray tests across several rotor radii verify clearance inside the fork lower and rear triangle, while the existing spoke tests verify that the flanges remain inboard of the rotors. These are model clearances, not installed-bike adjustment instructions.

`tireTread.ts` replaces the common five-row block pattern with distinct photo-based DHF and DHR II patterns. The DHF has longer, split directional center lugs; the DHR II has wider transverse braking blocks. Both use staggered, tilted shoulder knobs and actual narrow gaps in their raised top faces over connected rubber bases. `cables.ts` produces evenly sampled flowing paths with circular transported sections; cockpit loops, fork routing, rear exposed hose and OneUp cable retain their attachment endpoints.

Production build and all 112 tests pass. New checks cover structural rotor clearance, cable continuity/local turn angles, outward-facing tread and distinct front/rear lug proportions. The saddle padding check now reflects the increased thickness. Live model and theme previews were inspected in addition to geometry checks.

### Quieter selection context — 2026-10-05

Unselected parts share an unlit, theme-aware material, initially tried at 5% opacity and subsequently raised to the owner's requested 12%. The tint sits near the current studio background, with depth writes disabled and no environment reflections or clearcoat highlights. The material also covers custom saddle/grip meshes and chain pins. Unselected decals and grip end-cap artwork are hidden so lettering does not remain brighter than the context geometry. Selected parts retain their existing finishes and emphasis; isolate behavior is unchanged.

Light and dark selection states were inspected in the live browser. Production build and all 112 tests pass. A dark selection preview is saved at `artifacts/workbench-refinement/selection-focus.jpg`.

### Head tube and front triangle junction — 2026-10-05

The owner's full-bike and detail photographs guide a focused refinement of the head tube, upper shoulder and lower down-tube transition. The existing steering anchors and 120 mm head length remain fixed. A tapered circular front section blends into the single sculpted frame skin; the main opening has a tighter rounded inner corner and the top tube broadens toward the head. Head-region cap subdivision shares edges across adjacent triangles, and the surface field blends across tube centerlines. Vertices are indexed before evaluating the surface to avoid redundant work. These surfaces remain visual estimates rather than manufacturer CAD.

`headTube.ts` supplies the black front badge with stacked Santa Cruz lettering, paired oval cable entries, and shared cable endpoints. The rear brake and OneUp remote route to opposite entries with relaxed approaches. `frameMarkings.ts` attaches yellow HIGHTOWER lettering and its dark blue upper line to the top-tube crown. The badge/port recesses are visual surface details, not machined openings through a CAD solid.

Production build and 114 tests pass, including ray checks for the round head shell, cable attachment to the frame skin, existing cable smoothness, frame openings and mesh budgets. Live close-up inspection covered the front badge, tube junction and top lettering. Preview images are saved in `artifacts/head-tube-refinement/`. The temporary inspection camera was removed; normal workbench camera behavior is retained.

### Angular down tube, protection and storage — 2026-10-05

The next owner reference set emphasizes straight faces, rounded corners and a defined lower elbow. The down-tube spine now blends toward a rounded rectangular section with restrained 64–70 mm shaft width estimates, planar cheeks and broad inner/outer faces. The lower outline uses straighter runs into a compact rounded bend. This treatment is localized to the down-tube spine; the head-tube circular section and existing anchors remain in place.

`downTube.ts` adds a separate long underside pad and a second protector following the lower bend toward the BB, leaving a painted gap between them. A closed inner-face storage door includes a perimeter seal, bottle-cage mounting bosses and side latch. These are photo-based visual details; the door is not interactive and no bottle obscures it. Down-tube lettering is resized and positioned against the flatter side faces so it remains legible.

Profile loop winding is now normalized before extrusion. The new flat inner face exposed reversed hole walls that had been hidden when the rounded skin collapsed those walls. Ray tests check outward-facing panel support, sub-1.5 mm mounting gaps, planar cheeks and restrained width. Production build and all 116 tests pass. Live views of the outer pads, inner storage door and full frame are saved in `artifacts/down-tube-refinement/`.

### Red-line silhouette correction and smaller shock — 2026-10-05

The owner's annotated outline fixes the lower elbow and head-tube skirt while making the long outside down-tube edge parallel to the inside edge. A cubic tangent curve now joins that straight run to the underside of the head tube, replacing the missing concave shoulder. Profile curve controls follow winding reversal and scene scaling. Protection panels follow the corrected edge, and the side lettering fits the narrower face.

The shock body, reservoir, controls and decals are uniformly scaled to 85% about the shock midpoint. Eyelets, mounting widths and the 230 mm frame mount spacing remain fixed; short shaft/head necks bridge the scaled body to those mounts. This changes the visual envelope without detaching the shock from the frame.

Production build and all 117 tests pass. Checks cover shaft-edge parallelism, the curved shoulder's tangent, unchanged skirt/elbow positions, shock body dimensions and reservoir clearance. Older sidewall test rays now target the actual shaft center rather than the removed bulged portion. Assembled-bike and full-frame views are saved in `artifacts/down-tube-angle-refinement/`.

### Down-tube underside depth — 2026-10-05

Added 10 mm of side-profile depth perpendicular to the straight shaft, entirely on its outer/underside face. The inside edge, storage door, transverse width and head-tube skirt stay in place. The upper shoulder curve follows the offset tangent, and the added depth tapers through the lower elbow into the existing BB shell. Both protection pieces and side lettering follow the revised contour. The geometry check now verifies a 10 mm outward displacement with no shift along the shaft and unchanged inner-edge anchors. Production build and all 117 tests pass; the full-frame preview is in `artifacts/down-tube-thickness/`.

The following owner revision increases that entire section depth by 50%, including the prior 10 mm addition. All extra material again goes to the underside; the shoulder curve, tapered lower bend and protectors follow the new boundary. The regression now verifies 1.5 times the previous depth, unchanged inner anchors and no longitudinal shift. Build and all 117 tests pass. The latest full-frame preview is in `artifacts/down-tube-thickness-150/`.

### Softer lower edges and Santa Cruz wordmark — 2026-10-05

The approved side-profile thickness is retained. Scale-independent corner-radius factors along the down-tube spine keep the upper shaft squarer, then increase rounding toward the lower elbow. This changes the cross-section edges while preserving the outline, broad side faces and panel attachment. A ray-based comparison checks that the lower corners soften more than the upper corners; existing thickness and surface-support checks remain in place.

`santaCruzWordmark.ts` uses the letter outlines from [Santa Cruz's official SVG](https://www.santacruzbicycles.com/cdn/shop/files/header-logo.svg?v=1727298517), arranging its SANTA and CRUZ rows on a single baseline for the down-tube decal. The original angular glyphs and counters replace the generic italic font, with their aspect ratio preserved on both sides. The source SVG and full-frame preview are saved in `artifacts/wordmark-refinement/`. Production build and all 118 tests pass.

The October 6 follow-up further increases the lower corner factors from .76/.9/.7 to 1.05/1.15/.9, with the upper three points held at .38. This concentrates the stronger rounding below the midpoint while retaining the approved thickness and upper section. The production build and eight focused down-tube/profile tests pass, including panel support, upper-corner restraint and mesh validity. The updated full-frame preview is in `artifacts/down-tube-softer-edges/`.

### Curved underside and fitted rock protection — 2026-10-06

The next reference set shows that rounding only the corners still leaves an overly flat underside. A transverse circular crown now runs along the outside shaft and around the lower elbow. It retains the approved centerline silhouette and blends into the side faces and ends. Local subdivision supplies enough vertices across the previously flat extrusion walls to show the curvature. The inner storage face and side lettering retain their existing positions.

`rockGuards.ts` replaces the two flat protectors with closed surface shells sampled directly from the shaped carbon mesh. Both the inner and outer faces curve, with softened rims and rounded end corners. The upper guard tapers from 50 to 44 mm; the lower piece spans 52–54 mm, only slightly wider. The longitudinal gap and bend coverage remain. BVH surface sampling uses the already-installed `three-mesh-bvh` dependency, now declared directly, and caches the resulting guards for the same frame shape.

Build and all 119 tests pass. New checks verify transverse crown depth, guard-to-frame clearance, closed mesh edges, finite normals and the small width difference. Full-frame and angled views are saved in `artifacts/down-tube-curved-guards/`.

The next pass removes the small lip below the S at the upper shoulder. The underside crown now starts along the existing cubic head-tube transition rather than fading in at the start of the straight shaft. Centerline thickness, silhouette controls and guard widths are retained. A regression samples both sides just below the join to ensure there is no raised lip. Build and eight focused down-tube/head-tube tests pass; previews are in `artifacts/down-tube-shoulder-smoothing/`.

The final shoulder refinement removes a remaining reversal in the cubic outline itself. Its first control now sits at the intersection of the skirt tangent and the straight shaft line, replacing the fixed 49 mm handle that overshot that line. The two final controls are collinear with the shaft, giving zero curvature at the join without changing the endpoints or thickness. The regression checks monotonic approach to the shaft and prevents an S-bend. A temporary close-up camera confirmed the transition, then was restored. Build and all 120 tests pass; full-frame and close-up images are in `artifacts/down-tube-continuous-shoulder/`.

### Top tube, seat neck and frame marks — 2026-10-07

The top tube retains its traced outline, with a continuous rounded cross-section tapering from an 18 mm rear half-width to 25 mm at the front. Denser local tessellation and a surface blend that follows the actual rounded opening remove the crease at the head junction. The seat neck now follows the dropper axis with a circular 36.4 mm section, blending into the top-tube connection below the collar. A bounded geometry cache avoids rebuilding the same dense carbon mesh for guard sampling and rendering; callers receive independent disposable clones.

The HIGHTOWER decal uses reference-based upright vector block lettering and a narrow dark blue rule, curved across the crown. The head badge uses the original stacked Santa Cruz SVG outlines already used for the down-tube wordmark. Artwork textures preserve the physical decal aspect ratio. Approved down-tube thickness, shoulder controls and guard widths are retained.

The production build passes. All 122 tests in 17 files pass with `node node_modules/vitest/vitest.mjs run --maxWorkers=2`; unconstrained parallel runs hit the 5-second timeout in heavier geometry tests. New ray-based checks verify the smooth top-tube width progression and round seat neck. Close-up browser inspection covers the lettering, head badge and seat junction; temporary detail cameras were restored. Full-frame and detail previews are saved in `artifacts/top-tube-refinement/`.

### Seat junction, split collar and upper rear link — 2026-10-07

The seat/top-tube outline now uses a broader cubic transition tangent to the seat neck and crown. A continuous local cross-section and limited normal smoothing reduce the pinched surface highlights at the concave junction. The seat anchor and suspension pivot positions are unchanged.

`seatAssembly.ts` adds a hollow split clamp around the carbon rim, rear pinch ears, and recessed hex hardware. The upper rear link has rounded pivot ends, a wider lower opening, a dark ribbed upper recess, and a broad machined pivot cap with a hex socket. Both sides receive the same hardware detail. These are visual estimates from the owner's reference image.

Production build passes; all 125 tests in 18 files pass with one test worker. The new checks verify the clamp's outward-facing hollow shell and rear split, both link windows, and tangential curve ends. The BB clearance audit now skips profiles whose conservative bounds cannot reach the measured BB region, retaining its existing clearance assertions and timeout. Close-up and full-frame screenshots are in `artifacts/seat-junction-refinement/`; temporary inspection cameras were restored.

### Sculpted upper rear link — 2026-10-07

The additional assembled and isolated references clarify the upper link's three-dimensional construction. `rearLink.ts` now supplies bowed, tapering side arms with long recessed channels, thin mid-span rails, and flared bearing ends. The upper ribbed floor sits inside the channel; its lower portion remains open. A transverse web and hollow lower barrel connect the arms. Bevelled annular housings and dark socket caps replace the earlier flat plates and bright pivot pins. The pivot centers remain fixed, and this pass does not change the carbon frame geometry.

The production build and all 127 tests pass with one worker. Checks cover both recessed floors and open windows, outward housing faces, open bearing bores, and the crosspiece/barrel spans. The angled browser preview verifies the joined structure in place. Detail and full-frame images are in `artifacts/rear-link-refinement/`; the standard camera is restored.

### V-shaped link and owner close-ups — 2026-10-07

The owner's IMG_3478/3479 views guide the next pass. Arm center spacing now tapers from 71 mm at the seat/top-tube pivot to 51 mm at the rear-triangle pivot, with smooth transitions into the bearing ends. Recess floors and fine ribs follow the same taper. The connecting face is now a broad tapered web with an open rectangular pocket whose walls slope inward by 8 mm, replacing the narrow crosspiece. Dimensions remain visual estimates rather than measured hardware specifications.

The carbon stays are slimmer near their upper bearing mounts. A 5 mm transverse adjustment on each side fades within 95 mm of that pivot; the remainder of the rear triangle retains its prior alignment. An initial global adjustment reduced chainring clearance, so it was replaced with this local field. Pivot XY centers and axle alignment remain fixed. The build and all 130 tests pass with one worker, including taper direction, pocket opening/slope, mount clearance and the existing chainring clearance checks. Straight-on, angled and full-frame previews are in `artifacts/rear-link-v-profile/`; inspection cameras were restored.

### Lower frame cradle and triangular opening — 2026-10-08

The owner's latest references guide a continuous protective diagonal from the seat tube into the lower down-tube bend. A rounded triangular opening replaces the irregular small window, with its upper edge kept below the central shock trough. Broader carbon cheeks and a locally rounded cross-section soften the lower junction. The trough follows the existing shock axis with a parabolic transverse bowl and smooth end transitions; the shock primitives, mounts and 230 mm envelope are unchanged.

Local tessellation supports the curved surface within the existing 150,000-vertex frame budget. Spatial normal averaging uses cached neighboring cells to smooth highlights consistently across broad faces and densely sampled cutout edges. The approved upper down tube and head transition retain their previous controls. A new ray-based regression checks that the cradle remains below the shock axis, alongside the opening, guard support and suspension-clearance checks. Angled, opposite-side and full-frame browser previews are saved in `artifacts/lower-frame-refinement/`; the standard camera is restored.

Production build and all 131 tests in 18 files pass. The full geometry suite runs with one worker and a 15-second per-test allowance; the default 5-second limit timed out on three geometry audits without assertion failures.

### Open shock tunnel and thinner lower U — 2026-10-08

The next owner references clarify that the protective frame is two triangular carbon cheeks surrounding a longitudinal passage. The triangle now extends rearward, with a larger window and a shallower lower rail. The straight upper down-tube anchors remain registered while the lower bend rises toward a flatter side profile. The cheeks join above the rear shock passage into the seat tube beneath the upper rear-triangle pivot.

An elliptical cutter removes carbon through the rear of the cradle, leaving an actual tunnel to the lower black linkage. This replaces the earlier surface deformation in this area. The geometry operation uses [three-bvh-csg](https://github.com/gkjohnson/three-bvh-csg), pinned to 0.0.16 for compatibility with the existing three-mesh-bvh version. The resulting frame remains within the existing vertex budget. Rock-guard sampling now checks the actual closest carbon surface through the tighter bend, preserving the shell's clearance and curved fit.

The shock model and mount anchors retain their existing positions. New ray checks verify an unobstructed rearward passage, protective walls on both sides, and a joined roof above the shock axis. Production build and all 132 tests in 18 files pass with one worker and a 20-second test allowance. Rear tunnel, side detail and full-frame previews are saved in `artifacts/shock-tunnel-refinement/`; temporary inspection cameras were restored.

### Corrected lower frame and separated suspension assemblies — 2026-10-08

The latest complete drive-side photograph (05f5c1f3, displayed at 1806 × 980) guides the deeper asymmetric lower sweep and compact rounded window. Its BB, rear axle and head register the visual contours to the existing geometry anchors. The protective diagonal, substantial window walls, lower cradle and seat-tube shoulder remain one continuous carbon mesh. The rearward elliptical shock passage stays open between the two cheeks beneath the joined seat-tube roof. The earlier approved upper down tube, branding and shock appearance remain intact.

`lowerLink.ts` replaces the simplified solid plates with slim bent arms, real machined windows, three transverse bearing housings, socket caps and aligned axles. Cap tessellation happens before the transverse bend to prevent large flat triangles cutting through the carbon. The arm routes behind the protective support and narrows at the shock eyelet. The lower rear stay is slimmer across the bike and locally shifted outward, providing separation from the stationary carbon and rocker. Small spacers bridge the rear bearing to the rear-triangle mounts. XY pivot locations and the shock endpoints are unchanged.

Frame primitives now carry `front-triangle`, `rear-triangle`, `upper-link` and `lower-link` assembly identities, rendered as named scene subgroups. Existing category selection, highlighting, isolation and camera controls still apply to the parent frame. This prepares separate structural transforms without adding a suspension animation or changing the application's current interaction model.

Verified source: [Santa Cruz Hightower 4 MY25 support](https://www.santacruzbicycles.com/pages/product-support/hightower-4-my25). Existing manufacturer anchors include Medium/Low geometry, a 73 mm BB, 31.6 mm seatpost, 36.4 mm collar, and 230 × 57.5 mm shock with 40 × 10 mm front and 30 × 8 mm rear mounting specifications. Carbon contours, sections, window size, tunnel envelope, transverse offsets, pivot XY positions and reconstructed link dimensions are visual estimates. The modeled pivot hardware is not a manufacturing specification.

The complete suite passes: 134 tests in 19 files with one worker and a 20-second allowance. New checks inspect arm vertices and triangle intersections against stationary and moving carbon, excluding the intentional bearing-seat regions; they also verify all three bores and the machined window on both mirrored arms. Existing tunnel, surface, guard and chainring checks pass. Review images cover the full drive-side profile, front/rear three-quarter views, lower cradle, both links and an isolated rear tunnel view in `artifacts/frame-geometry-correction/`.

Remaining limits: this is a static visual reconstruction. Pivot placement, bearing seats and travel clearance need measured CAD or linkage data before any mechanical claim. Some interior tunnel and rear-stay highlights still show tessellation and could receive a separate surface-polish pass. Inspection cameras are restored after capture; no dependencies were added in this correction.

### Rear triangle from detached-part references (2026-10-09)

`rearTriangle.ts` supplies independent carbon sides with straighter rails, slender forward legs, smaller lower heels and a low U-shaped chainstay yoke near the cranks. The upper tips remain independent, extending ahead of the leg junctions to the existing upper-link pivots. Rear profiles use `flatFaces` to preserve broad cheeks and a rounded extrusion perimeter while spine values taper lateral thickness. This avoids the uneven surface highlights of the previous fully rounded lens sections. The front carbon and both linkage axes remain unchanged.

The rubber chainstay wrap samples the actual carbon surface and carries 22 closely spaced ribs, increasing toward the chainring. Production build and all 16 affected tests pass, covering yoke connection, static tyre clearance, open pivots, fixed-frame/rocker separation, chainring spacing and guard fit. Actual-mesh comparison renders and limitations are recorded in `artifacts/rear-triangle-owner-photos/README.md`. Full travel remains unverified; this pass used offline mesh renders because the browser process helper was unavailable.

### V4 structural inspection and bored mounts (2026-10-08)

The actual V4 photographs and manufacturer diagrams retain the diagonal stationary carbon wall and paired triangular lower windows. A later pasted prompt described a conflicting single opening; this revision follows the physical references. The lower window is enlarged, the upper-link and front-shock bores are drilled after skin shaping, solid shock bosses/BB filler are replaced with sleeves, and the moving rear bridge is swept behind the seat tube along the seatstay slope. Front shock hardware uses the published 40x10 dimension; rear remains 30x8.

`frameInspection.ts` selects the independent front/rear/link groups plus a frame-and-shock mode. BikeScene keeps those meshes mounted and changes group visibility, preventing costly geometry reconstruction when returning to the complete bike. Side and three-quarter camera presets expose the real production geometry. The assembly-tag-independent frame geometry cache reuses the mesh sampled by the rock guards.

`frameStructure.test.ts` checks view membership, fixed bore/window ray clearance, and triangle intersections between stationary carbon and both moving carbon sides/bridge. Existing lower-rocker tests continue checking clearance outside the intentional bearing seats. The comparison report and A-E isolated renders are in `artifacts/structural-reconstruction/README.md`. Pivot coordinates and carbon sections remain visual estimates; no full-travel kinematic accuracy is claimed.

### Rear brake posts, forward bridge and aligned legs (2026-10-10)

Rear brake support sweeps now belong to `rear-triangle` in the frame hierarchy; the caliper casting, mounting hardware, pads and rotor remain brake parts. `frameCoordinates.ts` holds the shared photo registration and anchor exports, avoiding a circular frame/brake dependency. Existing `frameGeometry.ts` exports remain available for consumers.

The chainstay bridge now faces forward in a horizontal plane near the lower pivots instead of dropping below the feet. The moving front strut follows the stationary seat-support leg's lower centerline direction, with the upper pivot tip extending ahead of it. The guard keeps its fitted rubber wrap but changes from 22 short ribs to 13 taller, wider teeth with a forward lean. Pivot and shock coordinates remain unchanged.

Production build and all 30 affected tests pass across six suites. Added checks verify frame ownership and physical attachment of both brake posts, parallel leg directions, and the bridge's raised position; existing tyre, carbon, rocker, guard, rotor and chainring checks remain active. Actual-mesh renders are updated in `artifacts/rear-triangle-owner-photos/`. Full travel remains unverified.

### Internal lower-rocker mount and brake-post transitions (2026-10-10)

The rear-frame brake supports now have curved centerlines and tapered elliptical roots embedded in the stay. Their caliper attachment coordinates and rear-frame ownership are retained. The lower rocker's fixed region moves from the outside to between the stationary carbon cheeks. A central clearance pocket in the front skin and two bored carbon shoulders accommodate the internal bearing; the fixed axle is shortened, while its exterior bolt heads and all three XY pivot axes remain aligned. Pocket dimensions scale with the rest of the scene model.

Validation: production build and 32 affected tests across rear triangle, frame structure, lower link, crank/pedals, profile geometry and brake geometry. Mesh audits cover open bores, physical attachment of the new carbon shoulders, and arm clearance from both carbon assemblies in the static pose. Close-ups are generated from actual scene meshes in `artifacts/rear-triangle-owner-photos`. Full suspension travel is not evaluated.

### Flatter moulded carbon seat-triangle legs (2026-10-10)

Local `flatSections` on the stationary front profile give the paired rear and diagonal shock-surrounding legs broad cheek faces and 4 mm rolled corners, fading into the existing roof and lower frame. This follows the painted carbon reference; it does not add an exposed-weave finish. Controls scale with the scene and preserve the round seat opening, pivot axes, windows and internal rocker pocket. The same profile generator still shapes the rest of the frame with its existing sections.

Validation: production build and 11 tests across frame structure, profile geometry and lower linkage. Direct mesh inspection renders are `seat-triangle-detail.png` and `frame-junction.png` under `artifacts/rear-triangle-owner-photos`; static-pose clearance only.

### Straight lower down tube and angular front-frame surfaces (2026-10-10)

The lower underside now follows one straight diagonal from the elbow toward the BB wrap, replacing the changing slopes along that run. The extra spherical underside deformation is removed: rounded rectangular sections provide a broad underside and rolled corners directly. The two rock protectors still sample the actual carbon surface, so their fit follows the new outline.

Front-frame spine sections now use narrower corner radii, including the lower elbow. The top tube has a tapered rounded rectangular section with 4 mm corners rather than an oval, and the shock cradle uses 5 mm corners. Independent round head and seat-neck sections remain. The moving rear carbon retains its softer rounded perimeter. Section dimensions scale into scene units with the rest of the model. The fixed lower-rocker pocket is widened by 3 mm on each inner face to clear the arm against the squarer carbon skin; its existing bored carbon shoulders retain the bearing attachment.

Validation: production build and 26 affected tests across seven suites, run with one worker and a 30-second allowance. Tests ray-check the straight lower run at several lateral offsets, flat undersides and top-tube faces, protector clearance, round neck/head sections, open windows and bores, and carbon/rocker separation. Actual-mesh before/after inspection views are saved as `frame-surfaces`, `down-tube-detail`, and `down-tube-side` in `artifacts/rear-triangle-owner-photos`. Views omit decals and environment lighting; this remains a photo-based static reconstruction.

### Underneath camera inspection and fading studio floor (2026-10-13)

OrbitControls now allows rotation almost directly underneath the bike. `StudioFloor` updates the grid and shadow receiver together after each controls update, using the camera's view elevation rather than its world height. Both fade smoothly between 8 and 1 degrees above horizontal, disappear for level and underside views, and return when the camera rises. Transparent floor materials do not write depth, and the invisible floor group is skipped entirely. Zoom, pan, inspection presets, themes and Reset view keep their existing behavior.

Production build and two camera-angle tests pass. Checks cover ordinary overhead views, the complete underside range, continuous fading, and independence from zoom distance and panned target height. Browser visual inspection was unavailable because the desktop browser helper failed to start; the live preview continues serving on port 5174.
