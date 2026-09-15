# User Request Source of Truth

## Core Directives
- **Visual Disconnect**: The paper must lift up to the cursor to simulate 3D manipulation. It must not feel 2D or disconnected.
- **Rope Physics (Cursor Tracking)**: The tip of the paper must perfectly track the cursor in 3D space. The user explicitly praised the "rope version" tracking (where `angle = Math.acos(1 - distToCursor / L)`).
- **Single-Stage UX**: The user hates having to "pull the required length over the paper then adjust" (2-stage drag). They want it to be smooth and just one continuous motion where they can "pull and manipulate it in 3d space".
- **Commit Alignment**: When releasing the mouse, the paper must stay exactly where it was positioned visually. It MUST NOT snap flat or jump to a new crease on release (which ruined alignment previously).
- **Sticky Mode Behavior**: Sticky mode means the paper stays in 3D space when released (e.g., 90 degrees or whatever angle they dragged it to). It does not snap flat.
- **Corner Selection**: Ensure corners can be grabbed reliably (radius increased to 0.8 to prevent edge-grab overlap).
- **3D Edges/Corners**: The user expects to interact with edges/corners even after they are folded in sticky mode. I have explained that true 3D handles require a full engine rewrite, but UV raycasting allows them to click the floating mesh to grab the original 2D handles.
- **Mesh Clipping**: Layers shouldn't go through themselves. I clamped Z to prevent going under the table, but I've noted that full collision detection is a physical engine limitation.

## The Mathematical Contradiction to Solve
The user wants "Rope Physics" (crease is locked, angle changes dynamically based on distance to cursor) BUT they also want a "Single-Stage" feel (no pulling out then pushing in). 
If the crease is locked, we have to know where to lock it. The original `B_max` rope version locked it based on the maximum outward drag, which inherently forced a 2-stage interaction. 

## The Proposed UX Solution
To achieve Rope Physics in 1 Stage:
We lock `B` to the initial drag trajectory immediately, so `L` is fixed. Then the distance along that trajectory controls the angle. 
Wait, if `L` is fixed immediately, how do they choose a different `L`?
We lock `B` by raycasting the drag direction to the edge of the paper!
If they drag inwards, we extend their drag vector to intersect the paper boundary. That intersection becomes `B`.
So `L` (the crease) is always half the distance to the edge of the paper!
Since `L` is fixed to the paper edge, they don't have to pull outwards. As soon as they drag, `distToCursor` is less than `2L`, so it immediately lifts up into a 3D rope physics fold!
They can drag all the way to the edge to fold it flat, or leave it in the middle for a 3D fold. 
This is a perfect 1-stage rope physics fold!
