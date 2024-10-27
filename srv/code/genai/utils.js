const array2VectorBuffer = (data) => {
    const sizeFloat = 4; // each float takes 4 bytes
    const sizeDimensions = 4; // size of the dimensions data in bytes
    const bufferSize = data.length * sizeFloat + sizeDimensions;

    const buffer = Buffer.allocUnsafe(bufferSize); // allocate buffer
    // Write the size (number of dimensions) into the buffer
    buffer.writeUInt32LE(data.length, 0);
    data.forEach((value, index) => {
        buffer.writeFloatLE(value, index * sizeFloat + sizeDimensions);
    });
    return buffer;
};

module.exports = {
    array2VectorBuffer
}