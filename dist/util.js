function jf(x) {
    return JSON.stringify(x);
}
function rectWaypoints(tl, br) {
    const nw = tl;
    const sw = { x: tl.x, y: br.y };
    const ne = { x: br.x, y: tl.y };
    const se = br;
    const n = { x: nw.x + ((ne.x - nw.x) / 2), y: nw.y };
    const s = { x: sw.x + ((se.x - sw.x) / 2), y: sw.y };
    const e = { x: ne.y + ((se.y - ne.y) / 2), y: ne.x };
    const w = { x: nw.y + ((sw.y - nw.y) / 2), y: nw.x };
    const wp = {
        nw: nw,
        sw: sw,
        ne: ne,
        se: se,
        n: n,
        s: s,
        e: e,
        w: w,
        all: new Map([
            ['nw', nw],
            ['sw', sw],
            ['ne', ne],
            ['se', se],
            ['n', n],
            ['s', s],
            ['e', e],
            ['w', w],
        ]),
        corners: new Map([
            ['nw', nw],
            ['sw', sw],
            ['ne', ne],
            ['se', se],
        ]),
        edges: new Map([
            ['n', n],
            ['s', s],
            ['e', e],
            ['w', w],
        ]),
    };
    return wp;
}
// CalcScale calculates the scale factor for a given AImg. It assumes that the AImg is oriented so
// that the height is not greater than the width. The goal of the returned scale is size the image
// such that the image is as small as it can be while both of the following criteria are also true:
// 1. The height of the image is 800 px or more
// 2. The width of the image is 1200 px or more
// The *usual* outcome is that the image is slightly too large for the cropbox in one dimension,
// while it's exactly the right height for the cropbox in the other direction.
function calcScale(aimg) {
    const img = aimg.img;
    if (img === null) {
        return null;
    }
    const h = img.naturalHeight;
    const w = img.naturalWidth;
    const aspectRatio = h / w;
    if (aspectRatio > (2 / 3)) {
        return lw / w;
    }
    return lh / h;
}
function depthSort(imgs) {
    const ordered = imgs.map(x => x);
    ordered.sort((a, b) => (a.depth - b.depth));
    return ordered;
}
function shallowCopyImgs(imgs) {
    return imgs.map(aimg => new AppImg(aimg.img, aimg.depth, aimg.state, aimg.scale, { x: aimg.position.x, y: aimg.position.y }, aimg.rotationcount, aimg.manually_scaled));
}
