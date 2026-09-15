// Ponytail: Minimal WebGPU compute shader for paper clipping detection.
// This replaces the WebGL Raycaster approach for O(n^2) vertex collision.

struct Vertex {
    pos: vec3<f32>,
    pad: f32, // Padding for 16-byte alignment
};

struct Config {
    num_vertices: u32,
    thickness: f32,
};

@group(0) @binding(0) var<storage, read> vertices_in: array<Vertex>;
@group(0) @binding(1) var<storage, read_write> collisions_out: array<u32>;
@group(0) @binding(2) var<uniform> config: Config;

// Shared memory for the workgroup to speed up the O(n^2) search
var<workgroup> tile: array<Vertex, 256>;

@compute @workgroup_size(256)
fn main(
    @builtin(global_invocation_id) global_id: vec3<u32>,
    @builtin(local_invocation_id) local_id: vec3<u32>,
    @builtin(workgroup_id) group_id: vec3<u32>
) {
    let id = global_id.x;
    if (id >= config.num_vertices) {
        return;
    }

    let my_vertex = vertices_in[id];
    var collision = 0u;

    // Tile-based O(N^2) comparison
    let num_tiles = (config.num_vertices + 255u) / 256u;
    
    for (var t = 0u; t < num_tiles; t = t + 1u) {
        let tile_idx = t * 256u + local_id.x;
        if (tile_idx < config.num_vertices) {
            tile[local_id.x] = vertices_in[tile_idx];
        }
        
        workgroupBarrier();

        for (var i = 0u; i < 256u; i = i + 1u) {
            let other_idx = t * 256u + i;
            if (other_idx >= config.num_vertices || other_idx == id) {
                continue;
            }
            
            let other = tile[i];
            let dist = distance(my_vertex.pos, other.pos);
            
            if (dist < config.thickness) {
                collision = 1u;
                break;
            }
        }
        
        workgroupBarrier();
        
        if (collision == 1u) {
            break;
        }
    }

    collisions_out[id] = collision;
}
