import zlib, struct, os, sys

def read_png_chunks(path):
    data = open(path, 'rb').read()
    assert data[:8] == b'\x89PNG\r\n\x1a\n'
    pos, chunks, idat = 8, [], b''
    while pos < len(data):
        ln = struct.unpack('>I', data[pos:pos+4])[0]
        typ = data[pos+4:pos+8]
        body = data[pos+8:pos+8+ln]
        if typ == b'IHDR':
            chunks.append(('IHDR', body))
        elif typ == b'IDAT':
            idat += body
        pos += 12 + ln
    return chunks[0][1], zlib.decompress(idat)

def unfilter(raw, w, h, bpp):
    stride = w * bpp
    out = bytearray(h * stride)
    prev = bytearray(stride)
    p = 0
    for y in range(h):
        f = raw[p]; p += 1
        line = bytearray(raw[p:p+stride]); p += stride
        if f == 1:
            for i in range(bpp, stride):
                line[i] = (line[i] + line[i-bpp]) & 255
        elif f == 2:
            for i in range(stride):
                line[i] = (line[i] + prev[i]) & 255
        elif f == 3:
            for i in range(stride):
                a = line[i-bpp] if i >= bpp else 0
                line[i] = (line[i] + ((a + prev[i]) >> 1)) & 255
        elif f == 4:
            for i in range(stride):
                a = line[i-bpp] if i >= bpp else 0
                b = prev[i]
                c = prev[i-bpp] if i >= bpp else 0
                pa, pb, pc = abs(b-c), abs(a-c), abs(a+b-2*c)
                pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                line[i] = (line[i] + pr) & 255
        out[y*stride:(y+1)*stride] = line
        prev = line
    return bytes(out)

def resize(pix, w, h, bpp, nw):
    nh = max(1, int(h * nw / w))
    out = bytearray(nw * nh * 3)
    for y in range(nh):
        sy0 = int(y * h / nh); sy1 = max(sy0+1, int((y+1) * h / nh))
        for x in range(nw):
            sx0 = int(x * w / nw); sx1 = max(sx0+1, int((x+1) * w / nw))
            r = g = b = 0; cnt = 0
            for sy in range(sy0, min(sy1, h)):
                base = sy * w * bpp
                for sx in range(sx0, min(sx1, w)):
                    o = base + sx * bpp
                    r += pix[o]; g += pix[o+1]; b += pix[o+2]; cnt += 1
            o2 = (y*nw + x) * 3
            out[o2] = r//cnt; out[o2+1] = g//cnt; out[o2+2] = b//cnt
    return bytes(out), nw, nh

def write_png(path, rgb, w, h):
    raw = bytearray()
    stride = w * 3
    for y in range(h):
        raw.append(0)
        raw += rgb[y*stride:(y+1)*stride]
    comp = zlib.compress(bytes(raw), 9)
    def chunk(t, d):
        c = struct.pack('>I', len(d)) + t + d
        return c + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    png = b'\x89PNG\r\n\x1a\n'
    png += chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0))
    png += chunk(b'IDAT', comp)
    png += chunk(b'IEND', b'')
    open(path, 'wb').write(png)
    return os.path.getsize(path)

def shrink(src, dst, target_w):
    ihdr, raw = read_png_chunks(src)
    w, h, depth, ctype = struct.unpack('>IIBB', ihdr[:10])
    bpp = {0:1, 2:3, 4:2, 6:4}[ctype]
    assert depth == 8, depth
    pix = unfilter(raw, w, h, bpp)
    rgb, nw, nh = resize(pix, w, h, bpp, target_w)
    size = write_png(dst, rgb, nw, nh)
    return size, (nw, nh)

if __name__ == '__main__':
    src, dst, tw = sys.argv[1], sys.argv[2], int(sys.argv[3])
    size, dim = shrink(src, dst, tw)
    print(f"{os.path.basename(dst)} {size//1024} KB {dim[0]}x{dim[1]}")
