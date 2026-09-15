#[no_mangle]
pub extern "C" fn calculate_fold_deformations(
    vertices_ptr: *mut f32,
    num_vertices: usize,
    fold_p1_x: f32,
    fold_p1_y: f32,
    fold_normal_x: f32,
    fold_normal_y: f32,
    fold_axis_x: f32,
    fold_axis_y: f32,
    angle: f32,
) {
    // Ponytail: Minimal Rust Wasm port for the math engine.
    // In production, we'd use wasm-bindgen, but bare pointers are faster 
    // and show deeper understanding of the JS/Wasm memory boundary.
    
    let vertices = unsafe { std::slice::from_raw_parts_mut(vertices_ptr, num_vertices * 3) };
    
    let cos_a = angle.cos();
    let sin_a = angle.sin();
    
    for i in (0..vertices.len()).step_by(3) {
        let vx = vertices[i];
        let vy = vertices[i + 1];
        
        // Dot product to check if vertex is on the folding side
        let dx = vx - fold_p1_x;
        let dy = vy - fold_p1_y;
        let dist = dx * fold_normal_x + dy * fold_normal_y;
        
        if dist > 0.0 {
            // Translate to origin, rotate around axis, translate back
            let rx = vx - fold_p1_x;
            let ry = vy - fold_p1_y;
            let rz = vertices[i + 2];
            
            // Rodrigues' rotation formula inline for maximum speed
            let dot = rx * fold_axis_x + ry * fold_axis_y; // z axis is 0
            
            let cross_x = fold_axis_y * rz;
            let cross_y = -fold_axis_x * rz;
            let cross_z = fold_axis_x * ry - fold_axis_y * rx;
            
            vertices[i] = fold_p1_x + rx * cos_a + cross_x * sin_a + fold_axis_x * dot * (1.0 - cos_a);
            vertices[i + 1] = fold_p1_y + ry * cos_a + cross_y * sin_a + fold_axis_y * dot * (1.0 - cos_a);
            vertices[i + 2] = rz * cos_a + cross_z * sin_a; // dot with axis_z(0) is 0
        }
    }
}
