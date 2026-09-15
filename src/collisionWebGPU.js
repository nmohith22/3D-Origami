import wgslCode from './collision.wgsl?raw';

export let webgpuDevice = null;
export let computePipeline = null;

export async function initWebGPU() {
    if (!navigator.gpu) {
        console.warn('WebGPU not supported in this browser. Collision detection compute shaders disabled.');
        return false;
    }

    try {
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) {
            console.warn('No WebGPU adapter found.');
            return false;
        }

        webgpuDevice = await adapter.requestDevice();

        const shaderModule = webgpuDevice.createShaderModule({
            code: wgslCode,
        });

        computePipeline = webgpuDevice.createComputePipeline({
            layout: 'auto',
            compute: {
                module: shaderModule,
                entryPoint: 'main',
            },
        });

        console.log('WebGPU Compute Pipeline initialized for collision detection.');
        return true;
    } catch (e) {
        console.warn('WebGPU init failed:', e);
        return false;
    }
}

export async function runCollisionCompute(verticesArray) {
    if (!webgpuDevice || !computePipeline) return new Uint32Array(verticesArray.length / 3);

    const numVertices = verticesArray.length / 3;
    const vertexBufferSize = Math.ceil(numVertices * 16 / 4) * 4; // 16 bytes per vertex (vec3 + pad)

    const vertexBuffer = webgpuDevice.createBuffer({
        size: vertexBufferSize,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    const collisionBuffer = webgpuDevice.createBuffer({
        size: numVertices * 4,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });

    const configBuffer = webgpuDevice.createBuffer({
        size: 8, // u32 num_vertices, f32 thickness
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const configData = new ArrayBuffer(8);
    const configView = new DataView(configData);
    configView.setUint32(0, numVertices, true);
    configView.setFloat32(4, 0.05, true); // thickness = 0.05

    // Write data
    const paddedVertices = new Float32Array(numVertices * 4);
    for (let i = 0; i < numVertices; i++) {
        paddedVertices[i * 4] = verticesArray[i * 3];
        paddedVertices[i * 4 + 1] = verticesArray[i * 3 + 1];
        paddedVertices[i * 4 + 2] = verticesArray[i * 3 + 2];
        paddedVertices[i * 4 + 3] = 0; // pad
    }

    webgpuDevice.queue.writeBuffer(vertexBuffer, 0, paddedVertices);
    webgpuDevice.queue.writeBuffer(configBuffer, 0, configData);

    const bindGroup = webgpuDevice.createBindGroup({
        layout: computePipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: { buffer: vertexBuffer } },
            { binding: 1, resource: { buffer: collisionBuffer } },
            { binding: 2, resource: { buffer: configBuffer } },
        ],
    });

    const commandEncoder = webgpuDevice.createCommandEncoder();
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(computePipeline);
    passEncoder.setBindGroup(0, bindGroup);
    
    const workgroupCount = Math.ceil(numVertices / 256);
    passEncoder.dispatchWorkgroups(workgroupCount);
    passEncoder.end();

    const readBuffer = webgpuDevice.createBuffer({
        size: numVertices * 4,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });

    commandEncoder.copyBufferToBuffer(collisionBuffer, 0, readBuffer, 0, numVertices * 4);
    webgpuDevice.queue.submit([commandEncoder.finish()]);

    await readBuffer.mapAsync(GPUMapMode.READ);
    const result = new Uint32Array(readBuffer.getMappedRange());
    const finalResult = new Uint32Array(result); // copy before unmap
    readBuffer.unmap();

    return finalResult;
}
