/*

A giant 3000 x 4000 canvas image with 9 photos on it, each one cropped down to 2 x 3 aspect ratio.
Each little image is meant to be 2 inches by 3 inches when the whole 3k x 4k image is printed.

The RL width that the 3000 x 4000 image should be displayed at is 7.5" x 10". That's a 400px X 400px
square, per inch. That means each little image should be an 800 x 1200 image.

Here's a basic visualization (not to scale) showing the kind of interface that I want to have, with
9 boxes in which to place and arrange images:

         ┌───────────────────────────────────────────────┐
         │                                               │
         │                                               │
         │     ┌─────────┐  ┌─────────┐  ┌─────────┐     │
         │     │         │  │         │  │         │     │
         │     │         │  │         │  │         │     │
         │     └─────────┘  └─────────┘  └─────────┘     │
         │                                               │
         │     ┌─────────┐  ┌─────────┐  ┌─────────┐     │
         │     │         │  │         │  │         │     │
         │     │         │  │         │  │         │     │
         │     └─────────┘  └─────────┘  └─────────┘     │
         │                                               │
         │     ┌─────────┐  ┌─────────┐  ┌─────────┐     │
         │     │         │  │         │  │         │     │
         │     │         │  │         │  │         │     │
         │     └─────────┘  └─────────┘  └─────────┘     │
         │                                               │
         │                                               │
         └───────────────────────────────────────────────┘

Features:
- [X] ↻ rotate images interactively
    - [X] Draw the ↻ rotate handle
    - [X] Clicking rotate handle causes rotation
- [X] ⇲ ⇱ scale images interactively
    - [X] Draw the ⇲ ⇱ scale handle
    - [X] Scale the image upon click-dragging scale handle
    - [ ] Anchor the opposite corner when click-drag scaling
- [X] draw the cropped version of each image

// draw the 9 boxes on the screen
// Where does each of the 9 boxes go?

Total space width not drawn boxes is 4000 - (1200 * 3) = 400
The four gaps between boxes & edges each are 100px = (400 / 4)

Total space height not drawn boxes is 3000 - (800 * 3) = 600
The four gaps between boxes & edges each are 150px = (600 / 4)

What are some of the events that might happen in my application?

NO_INPUT
DRAGGING_IMAGE
DRAGGING_IMAGE_RESIZE_HANDLE

CLICK_ROTATE
CLICK_IMAGE

canvasEvent -> applicationEvent

IMAGES need to have an order from front-to-back; called depth

///////////////////

We need to rotate and scale each image correctly when we first put it on the page. to do that, we need toorder
rotate the image so that it's aspect ratio is not taller than it is wide
once rotated, we need to shrink it down so that it's height isn't taller than 800 and it's width isn't wider than 4000

assume height is always shorter than width due to rotation normalization
if aspect ratio (h/w) > 2/3, then when scaling we must width match
if aspect ratio (h/w) < 2/3, then when scaling we must height match

///////////////////

We need a minimal kit of UI items. We need buttons and images, they all need to be drawble on the screen, orderable, clickable, dragable

*/
interface Coordinate {
    x: number;
    y: number;
}

interface UIItem {
    center: Coordinate;
    draw(ctx: CanvasRenderingContext2D): void
    intersectPoint(pt: Coordinate): UIItem | null
    clickHandler(pt: Coordinate): void
    clickEndHandler(firstPos: Coordinate, endPt: Coordinate): void
    dragHandler(firstPos: Coordinate, currentPos: Coordinate): void
    dragEndHandler(): void
}

class Rect {
    _tl: Coordinate;
    _br: Coordinate;
    constructor(topleft: Coordinate, bottomright: Coordinate) {
        this._tl = topleft;
        this._br = bottomright;
    }
    get topleft(): Coordinate {
        return this._tl;
    }
    get btright(): Coordinate {
        return this._br;
    }
    *[Symbol.iterator](): IterableIterator<Coordinate> {
        yield this._tl;
        yield this._br;
    }
    intersectPoint(point: Coordinate): Rect | null {
        const topleft = this.topleft;
        const btright = this.btright;
        if (topleft.x < point.x && topleft.y < point.y && btright.x > point.x && btright.y > point.y) {
            return this;
        }
        return null;
    }
    get area(): number {
        return this.height * this.width;
    }
    get width(): number {
        return this.btright.x - this.topleft.x;
    }
    get height(): number {
        return this.btright.y - this.topleft.y;
    }
    get center(): Coordinate {
        return { x: this.topleft.x + (this.width / 2), y: this.topleft.y + (this.height / 2) };
    }
}

class Button implements UIItem {
    topleft: Coordinate;
    btright: Coordinate;
    center: Coordinate;

    startDrag: Rect | null;
    // dunno what this'll be yet
    dragCallback: (b: Button, start: Coordinate, current: Coordinate) => void;
    clickCallback: (b: Button, start: Coordinate) => void;
    text: string;
    name: string;
    fill: string;
    constructor(
        topleft = { x: 0, y: 0 },
        btright = { x: 0, y: 0 },
        text = '',
        name = 'randomname',
        fill = '#00FF00',
        dragCallback: ((b: Button, start: Coordinate, current: Coordinate) => void) | null = null,
        clickCallback: ((b: Button, start: Coordinate) => void) | null = null,
    ) {
        this.topleft = topleft;
        this.btright = btright;
        this.center = { x: this.topleft.x + (this.width / 2), y: this.topleft.y + (this.height / 2) };
        if (dragCallback === null) {
            dragCallback = (b, firstPos, currentPos) => {
                this.defaultDragHandler(firstPos, currentPos);
                //console.log(`dragging name: ${b.name} Start: ${start}  currentPos: ${current}`);
                return;
            };
        }
        if (clickCallback === null) {
            clickCallback = (b, start) => {
                //console.log(`Clicked!: name: ${b.name} Start: ${start}`);
                return;
            };
        }
        this.dragCallback = dragCallback;
        this.clickCallback = clickCallback;
        this.text = text;
        this.fill = fill;
        this.startDrag = null;
        this.name = name;
    }
    intersectPoint(point: Coordinate): Button | null {
        const topleft = this.topleft;
        const btright = this.btright;
        if (topleft.x < point.x && topleft.y < point.y && btright.x > point.x && btright.y > point.y) {
            return this;
        }
        return null;
    }
    draw(ctx: CanvasRenderingContext2D): void {
        ctx.fillStyle = this.fill;
        ctx.fillRect(this.topleft.x, this.topleft.y, this.width, this.height);
        ctx.fillStyle = 'rgba(0, 0, 0, 1)';
        ctx.fillText(this.text, this.topleft.x, this.btright.y);
    }
    get height() {
        return this.btright.y - this.topleft.y;
    }
    get width() {
        return this.btright.x - this.topleft.x;
    }
    clickHandler(pt: Coordinate): void {
    }
    clickEndHandler(firstPos: Coordinate, endPt: Coordinate): void {
        this.clickCallback(this, firstPos);
    }
    defaultDragHandler(firstPos: Coordinate, currentPos: Coordinate): void {
        if (this.startDrag == null) {
            this.startDrag = new Rect(structuredClone(this.topleft), structuredClone(this.btright));
        }
        const dx = firstPos.x - currentPos.x;
        const dy = firstPos.y - currentPos.y;
        this.center.x = this.startDrag.center.x - dx;
        this.center.y = this.startDrag.center.y - dy;
        const h = this.height;
        const w = this.width;
        this.topleft.x = this.center.x - (w / 2);
        this.topleft.y = this.center.y - (h / 2);
        this.btright.x = this.center.x + (w / 2);
        this.btright.y = this.center.y + (h / 2);
    }
    dragHandler(firstPos: Coordinate, currentPos: Coordinate): void {
        this.dragCallback(this, firstPos, currentPos);
    }
    dragEndHandler(): void {
        this.startDrag = null;
    }
}

interface LightImage {
    naturalHeight: number;
    naturalWidth: number;
    height: number;
    width: number;
}

interface NamedImage {
    name: string;
    image: LightImage;
}

interface NamedBlob {
    name: string;
    blob: Blob;
}

enum ImgState {
    SELECTED = 1,
    INACTIVE,
}
class AppImg implements UIItem {
    img: LightImage | null;
    name: string;
    original: LightImage | null;
    depth: number | null;
    state: ImgState;
    scale: number;
    dragStartScale: number | null;
    dragStartposition: Coordinate | null;
    position: Coordinate;
    rotationcount: number;
    manually_scaled: boolean;
    btns: Button[];
    showCropped: boolean = false;
    cropRect: Rect | null = null;
    cropBtn: Button | null = null;

    constructor(
        image: NamedImage,
        depth: number | null = null,
        state = ImgState.INACTIVE,
        scale = 1,
        position = { x: 0, y: 0 },
        rotationcount = 0,
        manually_scaled = false,
    ) {
        const img = image.image;
        this.img = img;
        if (img && img.naturalHeight === undefined) {
            throw Error;
        }
        this.name = image.name;
        // Subsequent rotations will use this original as the starting point, with this.img being
        // replaced.
        this.original = img;
        this.rotationcount = rotationcount;
        if (depth === null) {
            this.depth = window.DRAWSTATE.images.length;
        } else {
            this.depth = depth;
        }

        this.state = state;
        this.scale = scale;
        this.position = position;
        this.dragStartposition = null;
        this.dragStartScale = null;
        this.manually_scaled = manually_scaled;
        this.btns = [];
    }

    intersectPoint(point: Coordinate): AppImg | Button | null {
        for (const btn of this.btns) {
            let res = btn.intersectPoint(point);
            if (res) {
                return res;
            }
        }
        let bb = this.imgBoundingBox();
        // If we're in the mode where we're showing the cropped version of the images, not just the
        // whole image, then we clicking on any "background canvas" to cause a deselection. So we
        // only do intersection testing in the cropRect in that case.
        if (this.showCropped && this.cropRectangle) {
            let overlap: Rect | null = rectangleIntersection(this.imgBoundingBox()!, this.cropRect!);
            if (overlap) {
                bb = overlap;
            }
        }
        if (bb === null) {
            return null;
        }
        const topleft = bb.topleft;
        const btright = bb.btright;
        if (topleft.x < point.x && topleft.y < point.y && btright.x > point.x && btright.y > point.y) {
            return this;
        }

        return null;
    }

    // imgBoundingBox gives us a bounding box in user-screen space coordinate system showing the
    // bounding box that the image takes up on the screen; after scaling.
    imgBoundingBox(): Rect | null {
        if (this.img === null) {
            return null;
        }
        return new Rect(this.position, { x: this.position.x + this.width, y: this.position.y + this.height });
    }
    // Width is the width of the image as it's displayed onscreen; that is, after it's been scaled
    // by the scale factor.
    get width(): number {
        return this.img!.naturalWidth * this.scale;
    }
    // Height is the height of the image as it's displayed onscreen; that is, after it's been scaled
    // by the scale factor.
    get height(): number {
        return this.img!.naturalHeight * this.scale;
    }
    get cropRectangle(): Rect | null {
        if (!this.cropBtn) {
            return null;
        }
        // see what rectangle the crop button (the blue button) exist inside, set that rectangle as
        // the one we'll use to crop into
        for (const [ridx, rrect] of window.DRAWSTATE.rects.entries()) {
            if (rrect.r.intersectPoint(this.cropBtn.topleft)) {
                this.cropRect = rrect.r;
            }
        };
        return this.cropRect;
    }
    get center(): Coordinate {
        const h = this.height;
        const w = this.width;
        return { x: this.position.x + (w / 2), y: this.position.y + (h / 2) };
    }
    draw(ctx: CanvasRenderingContext2D): void {
        ctx.font = 'bold 28px sans-serif';
        if (this.showCropped && this.cropRectangle) {
            let overlap: Rect | null = rectangleIntersection(this.imgBoundingBox()!, this.cropRect!);
            if (overlap) {
                // rectangle of overlap is in screen-space coordinates, and we need it in
                // image-space coordinates.
                const iscr = new Rect(
                    { x: overlap.topleft.x - this.position.x, y: overlap.topleft.y - this.position.y },
                    { x: overlap.btright.x - this.position.x, y: overlap.btright.y - this.position.y },
                );
                // scale the image-space coordinates to match the natural coordinates.
                const siscr = new Rect(
                    { x: iscr.topleft.x / this.scale, y: iscr.topleft.y / this.scale },
                    { x: iscr.btright.x / this.scale, y: iscr.btright.y / this.scale },
                );
                ctx.drawImage(this.img as HTMLImageElement,
                    siscr.topleft.x, siscr.topleft.y, siscr.width, siscr.height,
                    overlap.topleft.x, overlap.topleft.y, overlap.width, overlap.height);
                // Draw the name of the image in the SW corner
                ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
                ctx.fillText(this.name, this.cropRectangle.topleft.x, this.cropRectangle.btright.y + 40);
            } else {
                ctx.drawImage(this.img as HTMLImageElement,
                    this.position.x, this.position.y,
                    this.width, this.height);
            }
        } else {
            ctx.drawImage(this.img as HTMLImageElement,
                this.position.x, this.position.y,
                this.width, this.height);
        }
        if (this.state == ImgState.SELECTED) {
            ctx.strokeStyle = 'rgba(1, 200, 1, 0.25)';
            const lwd = 10;
            const hlwd = lwd / 2;
            ctx.lineWidth = lwd;
            ctx.strokeRect(this.position.x - hlwd, this.position.y - hlwd,
                // adding the padding width twice here to make up for the subtraction from the
                // position as this is length not position based
                this.width + hlwd + hlwd, this.height + hlwd + hlwd);
        }
        for (const btn of this.btns) {
            btn.draw(ctx);
        }
    }
    findBiggestIntersection(): Rect | null {
        const us: Rect = this.imgBoundingBox()!;
        let biggest: null | Rect = null;
        for (const [ridx, rrect] of window.DRAWSTATE.rects.entries()) {
            let rect = new Rect(
                { x: rrect.x, y: rrect.y },
                { x: rrect.x + rrect.width, y: rrect.y + rrect.height },
            );
            let intersection = rectangleIntersection(rect, us);
            if (!intersection) {
                continue
            }
            if (!biggest) {
                biggest = intersection;
                continue
            }
            if (intersection.area > biggest.area) {
                biggest = intersection;
            }
        }
        return biggest;
    }
    clickHandler(pt: Coordinate): void {
        this.select();
    }
    clickEndHandler(firstPos: Coordinate, endPt: Coordinate): void {
        // if they clicked a button, then do the clicking of that child button
        for (const btn of this.btns) {
            let res = btn.intersectPoint(firstPos);
            if (res) {
                res.clickEndHandler(firstPos, endPt);
            }
        }
    }
    dragHandler(firstPos: Coordinate, currentPos: Coordinate): void {
        if (this.dragStartposition == null) {
            this.dragStartposition = structuredClone(this.position);
        }
        if (this.dragStartScale === null) {
            this.dragStartScale = this.scale;
        }
        const dx = firstPos.x - currentPos.x;
        const dy = firstPos.y - currentPos.y;
        this.position.x = this.dragStartposition.x - dx;
        this.position.y = this.dragStartposition.y - dy;
        for (const btn of this.btns) {
            btn.dragHandler(firstPos, currentPos);
        }
    }
    dragEndHandler(): void {
        this.dragStartposition = null;
        this.dragStartScale = null;
        for (const btn of this.btns) {
            btn.dragEndHandler();
        }
    }

    select(): void {
        if (this.state == ImgState.SELECTED) {
            return;
        }
        this.state = ImgState.SELECTED;
        this.depth = 0;
        const others = window.DRAWSTATE.images.filter(x => x !== this);
        for (const o of others) {
            o.depth! += 1;
            o.deselect();
        }
        const [tl, br] = this.imgBoundingBox()!;
        const waypoints = rectWaypoints(
            { x: tl.x - 20, y: tl.y - 20 },
            { x: br.x + 20, y: br.y + 20 },
        );
        const cornerModifiers = {
            'ne': [1, -1],
            'se': [1, 1],
            'sw': [-1, 1],
            'nw': [-1, -1],
        };
        const cornerText = {
            'ne': '🡥',
            'se': '🡦',
            'sw': '🡧',
            'nw': '🡤',
        };
        for (const [name, corner] of waypoints.corners.entries()) {
            const tl = { x: corner.x - 10, y: corner.y - 10 };
            const br = { x: corner.x + 10, y: corner.y + 10 };
            const getOthers = (): Button[] => this.btns.filter(b => b.name !== name);
            const btn = new Button(tl, br, cornerText[name], name, '#00FF00', (b: Button, start: Coordinate, currentPos: Coordinate) => {
                // gotta call the default for movement.
                b.defaultDragHandler(start, currentPos);

                if (!!!b.startDrag?.intersectPoint(start)) {
                    return;
                }
                if (this.dragStartScale === null) {
                    this.dragStartScale = this.scale;
                }

                let dx = currentPos.x - start.x;
                let dy = currentPos.y - start.y;

                const [modx, mody] = cornerModifiers[name];
                dx = dx * modx;
                dy = dy * mody;

                const newH = (this.img!.naturalHeight * this.dragStartScale!) + dy;
                const newW = (this.img!.naturalWidth * this.dragStartScale!) + dx;
                const newScaleH = newH / this.img!.naturalHeight;
                const newScaleW = newW / this.img!.naturalWidth;
                this.scale = Math.max(newScaleH, newScaleW);
            });
            this.btns.push(btn);
        }
        {
            let north: Coordinate = waypoints.n;
            let nyoffset: number = -30;
            const tl = { x: north.x - 10, y: (north.y - 10 + nyoffset) };
            const br = { x: north.x + 10, y: (north.y + 10 + nyoffset) };
            const btn = new Button(tl, br, '↻', 'north rotator', '#FF0000', null, () => {
                this.rotateClockwise();
            });
            this.btns.push(btn);
        }
        {
            if (!this.cropBtn) {
                let north: Coordinate = waypoints.n;
                let nyoffset: number = 80;
                const size = 20;
                const tl = { x: north.x - size + 50, y: (north.y - size + nyoffset) };
                const br = { x: north.x + size + 50, y: (north.y + size + nyoffset) };
                const btn = new Button(tl, br, 'X', 'cropper', '#00FFFF',
                    (b, firstPos, currentPos) => {
                        if (b.startDrag == null) {
                            b.startDrag = new Rect(structuredClone(b.topleft), structuredClone(b.btright));
                        }
                        // if we're being intentionally dragged, then update without caring. if we're
                        // being incidentally moved, then clamp our movement to the cropRect
                        const intentionalDrag = b.startDrag.intersectPoint(firstPos);
                        if (intentionalDrag) {
                            b.defaultDragHandler(firstPos, currentPos);
                            return;
                        }
                        if (!this.cropRect) {
                            b.defaultDragHandler(firstPos, currentPos);
                            return;
                        }

                        // here's how we clamp our movement to the croprect
                        const dx = firstPos.x - currentPos.x;
                        const dy = firstPos.y - currentPos.y;
                        const newcenter = { x: b.startDrag.center.x - dx, y: b.startDrag.center.y - dy };
                        b.center.x = clamp(newcenter.x, this.cropRect.topleft.x, this.cropRect.btright.x);
                        b.center.y = clamp(newcenter.y, this.cropRect.topleft.y, this.cropRect.btright.y);

                        const h = b.height;
                        const w = b.width;
                        b.topleft.x = b.center.x - (w / 2);
                        b.topleft.y = b.center.y - (h / 2);
                        b.btright.x = b.center.x + (w / 2);
                        b.btright.y = b.center.y + (h / 2);
                    },
                    (b: Button) => {
                        this.showCropped = !this.showCropped;
                        for (const [ridx, rrect] of window.DRAWSTATE.rects.entries()) {
                            if (rrect.r.intersectPoint(b.topleft)) {
                                this.cropRect = rrect.r;
                            }
                        };
                    });
                this.cropBtn = btn;
            }
            this.btns.push(this.cropBtn);
        }
    }
    deselect() {
        this.state = ImgState.INACTIVE;
        this.btns = [];
    }

    rotateClockwise(count = 1) {
        return new Promise((resolve, reject) => {
            this.rotationcount = (this.rotationcount + count) % 4;

            if (this.original === null) {
                return reject(new Error('original is null'));
            }
            const canvas1 = document.createElement('canvas');
            if (this.rotationcount % 2 === 1) {
                // Flip the canvas w&h since they'll be 90 from current orientation
                canvas1.width = this.original.naturalHeight;
                canvas1.height = this.original.naturalWidth;
            } else {
                canvas1.height = this.original.naturalHeight;
                canvas1.width = this.original.naturalWidth;
            }

            const ctx1 = canvas1.getContext('2d');
            if (ctx1 === null) {
                return reject(new Error('context is null'));
            }

            // Center the 0,0 at the middle of the canvas, then rotate 90 degrees.
            const width = canvas1.width;
            const height = canvas1.height;
            ctx1.translate(width / 2, height / 2);
            ctx1.rotate(90 * this.rotationcount * Math.PI / 180);
            // Shift the image left and up by half the images width&height so that our drawn image
            // is now centered over 0,0 which is actually the center of the canvas because we
            // translated 0,0 to be the center
            ctx1.drawImage(this.original as HTMLImageElement, -this.original.naturalWidth / 2, -this.original.naturalHeight / 2);
            const rawImgData = canvas1.toDataURL('image/png', 1);
            const newimg = new Image();
            newimg.addEventListener('load', () => {
                if (this.manually_scaled === false) {
                    let sc = calcScale(this);
                    if (sc === null) {
                        return;
                    }
                    this.scale = sc;
                }

                this.img = newimg;
                resolve("hooray");
                // Disgusting dirty hack to get buttons right:
                if (this.state == ImgState.SELECTED) {
                    this.deselect();
                    this.select();
                }
            });
            newimg.src = rawImgData;
        });
    }
}


// clickedItem returns the item that's been clicked on by the point pos, if an item has been
// clicked. If items are stacked, then clicks on the one that's in the foreground (has smallest
// .depth)
function clickedItem(pos: Coordinate, imgs: AppImg[]): UIItem | null {
    const ordered = depthSort(imgs);
    for (const [_, aimg] of ordered.entries()) {
        const res = aimg.intersectPoint(pos);
        if (res) {
            return res;
        }
    }
    return null;
}

// clickedImage returns the img that's been clicked on by the point pos, if an item has been
// clicked. This gets the AppImg, not whatever button above or near that image which belongs to that
// image.
function clickedImg(pos: Coordinate, imgs: AppImg[]): AppImg | null {
    const ordered = depthSort(imgs);
    for (const [_, aimg] of ordered.entries()) {
        const res = aimg.intersectPoint(pos);
        if (res) {
            return aimg;
        }
    }
    return null;
}

function rectangleIntersection(rect1: Rect, rect2: Rect): Rect | null {
    // Check for no intersection; proof by contradiction
    // if A.leftedge >= B.rightedge then A is to the right of B
    // if A.rightedge <= B.leftedge then A is to the left of B
    // if A.topedge >= B.bottomedge then A is below B (because flipped y axis)
    // if A.bottomedge <= B.topedge then A is above B (because flipped y axis)
    const ArghtofB = rect1.topleft.x >= rect2.btright.x;
    const AleftofB = rect1.btright.x <= rect2.topleft.x;
    const AaboveB = rect1.topleft.y >= rect2.btright.y;
    const AbelowB = rect1.btright.y <= rect2.topleft.y;
    if (
        ArghtofB ||
        AleftofB ||
        AaboveB ||
        AbelowB
    ) {
        return null; // No intersection
    }

    // Calculate intersection coordinates and dimensions
    const x1 = Math.max(rect1.topleft.x, rect2.topleft.x);
    const y1 = Math.max(rect1.topleft.y, rect2.topleft.y);
    const x2 = Math.min(rect1.btright.x, rect2.btright.x);
    const y2 = Math.min(rect1.btright.y, rect2.btright.y);

    const intersection = new Rect({ x: x1, y: y1 }, { x: x2, y: y2 });
    return intersection;
}

const testA1 = new Rect({ x: 0, y: 0 }, { x: 3, y: 2 });

const testB1 = new Rect({ x: -2, y: -1 }, { x: 1, y: 1 }); // overlap nwA
const testB2 = new Rect({ x: 2, y: -1 }, { x: 5, y: 1 }); // overlap neA
const testB3 = new Rect({ x: -2, y: 1 }, { x: 1, y: 3 }); // overlap swA
const testB4 = new Rect({ x: 2, y: 1 }, { x: 5, y: 3 }); // overlap seA

const testA2 = new Rect({ x: 600, y: -852 }, { x: 1800, y: 806.13449 });
const testC2 = new Rect({ x: 2700, y: 2050 }, { x: 3900, y: 2850 });

const cases = [
    { A: testA1, B: testB1, expect: (r: Rect | null) => { console.assert(r !== null && jf(r.topleft) == jf({ x: 0, y: 0 }) && jf(r.btright) == jf({ x: 1, y: 1 })); } },
    { A: testA1, B: testB1, expect: (r: Rect | null) => { console.assert(r !== null && jf(r.topleft) == jf({ x: 0, y: 0 }) && r.width == 1 && r.height == 1); } },
    { A: testA1, B: testB2, expect: (r: Rect | null) => { console.assert(r !== null && jf(r.topleft) == jf({ x: 2, y: 0 }) && r.width == 1 && r.height == 1); } },
    { A: testA1, B: testB3, expect: (r: Rect | null) => { console.assert(r !== null && jf(r.topleft) == jf({ x: 0, y: 1 }) && r.width == 1 && r.height == 1); } },
    { A: testA1, B: testB4, expect: (r: Rect | null) => { console.assert(r !== null && jf(r.topleft) == jf({ x: 2, y: 1 }) && r.width == 1 && r.height == 1); } },

    { A: testA2, B: testC2, expect: (r: Rect | null) => { console.assert(r == null); } },
];
for (const tcase of cases) {
    const res = rectangleIntersection(tcase.A, tcase.B);
    tcase.expect(res);
};

const lw = 1200;
const lh = 800;
const xpad = 100;
const ypad = 150;


interface Window {
    DRAWSTATE: {
        uiItems: any[];
        images: AppImg[];
        rects: any[];
        dbgtext: string;
    };
}
window.DRAWSTATE = {
    uiItems: [],
    images: [],
    rects: [],
    dbgtext: '',
};

function downloadCanvas(canvas: HTMLCanvasElement) {
    const now = new Date();
    const year_s = `${now.getFullYear()}`;
    const month_s = `${now.getMonth()}`.padStart(2, '0');
    const day_s = `${now.getDay()}`.padStart(2, '0');
    const hour_s = `${now.getHours()}`.padStart(2, '0');
    const minutes_s = `${now.getMinutes()}`.padStart(2, '0');
    const seconds_s = `${now.getSeconds()}`.padStart(2, '0');
    const ms_s = `${now.getMilliseconds()}`.padStart(3, '0');
    const fname = `scrapbook_grid_${year_s}-${month_s}-${day_s}_${hour_s}-${minutes_s}-${seconds_s}-${ms_s}.png`
    let downloadLink = document.createElement('a');
    downloadLink.setAttribute('download', fname);
    canvas.toBlob(function(blob) {
        if (!blob) {
            return;
        }
        let url = URL.createObjectURL(blob);
        downloadLink.setAttribute('href', url);
        downloadLink.click();
    });
}

function loadImages(inputFiles: NamedBlob[]): void {
    for (let fidx = 0; fidx < inputFiles!.length; fidx++) {
        const file = inputFiles![fidx];
        const fr = new FileReader();
        fr.addEventListener('load', () => {
            const img = new Image();
            img.addEventListener('load', () => {
                (async () => {
                    const nm = new AppImg({ image: img, name: file.name });
                    if (nm.width < nm.height) {
                        await nm.rotateClockwise();
                    }
                    let rectIndex = window.DRAWSTATE.images.length % window.DRAWSTATE.rects.length;

                    nm.position.x = window.DRAWSTATE.rects[rectIndex].x;
                    nm.position.y = window.DRAWSTATE.rects[rectIndex].y;
                    nm.scale = calcScale(nm)!;
                    window.DRAWSTATE.images.push(nm);
                    window.DRAWSTATE.uiItems.push(nm);
                    console.log(`pushed image ${fidx} named ${nm.name} as #${window.DRAWSTATE.images.length - 1}`);
                })();
            });
            img.src = fr.result as string;
        });
        fr.readAsDataURL(file.blob);
    }
}

function getImagesFromDOM(): NamedBlob[] {
    const input: HTMLInputElement = document.querySelector('#imgfile')!;
    let files = input.files!;
    let blobList: NamedBlob[] = [];
    for (let f of files) {
        blobList.push({ name: f.name, blob: f as Blob });
    }
    return blobList;
}


document.addEventListener('DOMContentLoaded', _ => {
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
            const x = (row * (lw + xpad)) + xpad;
            const y = (col * (lh + ypad)) + ypad;
            const rectangle = new Rect({ x: x, y: y }, { x: x + lw, y: y + lh });
            window.DRAWSTATE.rects.push({ row, col, x, y, height: lh, width: lw, color: 'black', r: rectangle });
        }
    }
    // sometimes on page load, the user will have items in the #imgfile input because they selected
    // them then reloaded the page. In that case, we *DO* want to immediately reload these images.
    loadImages(getImagesFromDOM());

    const canvas: HTMLCanvasElement = document.querySelector('#canvas')!;

    document.querySelector('#imgfile')!.addEventListener('change', () => {
        return loadImages(getImagesFromDOM());
    });
    document.querySelector('#download')!.addEventListener('click', () => {
        downloadCanvas(canvas);
    });
    let dropzone = document.querySelector('#dropzone')!;
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
    });
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        if (!(e instanceof DragEvent)) {
            return;
        }
        if (!e.dataTransfer?.items) {
            return
        }
        let files: NamedBlob[] = [];
        for (const item of e.dataTransfer.items) {
            let f = item.getAsFile();
            if (!f) {
                continue;
            }
            files.push({ name: f.name, blob: f as Blob });
        }
        loadImages(files);
    });

    canvas.width = 4000;
    canvas.height = 3090;
    const canv = canvas;
    const ctx = canv.getContext('2d')!;
    function do_the_frame() {
        ctx.clearRect(0, 0, canv.width, canv.height);
        ctx.save();

        for (const uii of depthSort(window.DRAWSTATE.uiItems).reverse()) {
            ctx.save();
            uii.draw(ctx);
            ctx.restore();
        }

        // translate by 0.5 for the rectangle drawing so that our rectangles will be drawn with
        // 1 pixel lines instead of 2 pixel lines. See this stackoverflow:
        //     https://stackoverflow.com/a/13884434
        ctx.translate(0.5, 0.5);
        for (const rect of window.DRAWSTATE.rects) {
            // The dashed patterns here give us an alternating pattern of white blank black
            // blank, which we can only acheive by drawing the box twice with two different dashed
            // patterns that offset each other.
            //                                     1    1    2
            //                           0    5    0    5    0
            //     [1, 3]       black    -   -   -   -   -   -   -
            //     [0, 2, 1, 1] white      -   -   -   -   -   -
            //
            //     End result on screen  b w b w b w b w b w b w b
            //
            // The -1 +1 nonsense is to draw the rectangle exactly 1 pixel around the actual
            // rectangle that we crop into.
            ctx.strokeStyle = 'rgb(0, 0, 0)';
            ctx.setLineDash([1, 3]);
            ctx.strokeRect(rect.x - 1, rect.y - 1, rect.width + 1, rect.height + 1);
            ctx.strokeStyle = 'rgb(255, 255, 255)';
            ctx.setLineDash([0, 2, 1, 1]);
            ctx.strokeRect(rect.x - 1, rect.y - 1, rect.width + 1, rect.height + 1);
        }

        //ctx.fillText(window.DRAWSTATE.dbgtext, 10, 30);

        ctx.restore();

        window.requestAnimationFrame(do_the_frame);
    }

    let isDown = false; // Mouse button is held down
    let isMoving = false; // We're moving (dragging)
    const radius = 3 * 3; // Radius in pixels, 3 squared
    let firstPos: Coordinate; // Keep track of first position

    let selectedItem: UIItem | null = null;

    window.addEventListener('keydown', (evt: Event): void => {
        const event: KeyboardEvent = evt as KeyboardEvent;
        const keyDragMap: Map<string, [number, number]> = new Map([
            ['ArrowUp', [0.0, -1.0]],
            ['ArrowRight', [1.0, 0.0]],
            ['ArrowDown', [0.0, 1.0]],
            ['ArrowLeft', [-1.0, 0.0]],
        ]);
        if (!keyDragMap.has(event.key)) {
            return;
        }
        event.preventDefault();
        const img = clickedImg(firstPos, window.DRAWSTATE.images);
        if (!img) {
            return;
        }
        let c = img.center;
        let [xm, ym] = keyDragMap.get(event.key)!;
        if (event.shiftKey) {
            xm *= 15;
            ym *= 15;
        }
        firstPos.x += xm;
        firstPos.y += ym;
        img.dragHandler(c, { x: c.x + xm, y: c.y + ym });
        img.dragEndHandler();
    });

    function getXY(e: MouseEvent): Coordinate {
        const rect = canvas!.getBoundingClientRect();
        const t = { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height };
        const temporary = { x: Math.trunc(t.x * rect.width), y: Math.trunc(t.y * rect.height) };
        return temporary;
    }

    canvas.addEventListener('mousedown', e => {
        firstPos = getXY(e);
        isDown = true; // Record mouse state
        isMoving = false; // Reset move state
        window.DRAWSTATE.dbgtext = 'MOUSE DOWN';

        const item: UIItem | null = clickedItem(firstPos, window.DRAWSTATE.images);
        if (!item) {
            selectedItem = null;
            console.log(`Clicked but not on an image`);
            for (const item of window.DRAWSTATE.images) {
                item.deselect();
            }
            return;
        }


        item.clickHandler(firstPos);
        selectedItem = item;
    });
    window.addEventListener('mousemove', e => {
        if (!isDown) {
            return;
        } // We will only act if mouse button is down

        const pos = getXY(e); // Get current mouse position

        // calculate distance from click point to current point
        const dx = firstPos.x - pos.x;
        const dy = firstPos.y - pos.y;
        const dist = dx * dx + dy * dy; // Skip square-root (see above)

        if (dist >= radius) {
            isMoving = true;
        } // 10-4 we're on the move

        window.DRAWSTATE.dbgtext = 'MOVING';

        if (isMoving) {
            selectedItem?.dragHandler(firstPos, pos);
        }
    });

    window.addEventListener('mouseup', e => {
        if (!isDown) {
            return;
        } // No need for us in this case

        isDown = false; // Record mouse state

        if (!isMoving) {
            window.DRAWSTATE.dbgtext = 'JUST A CLICK';
            let pos = getXY(e);
            selectedItem?.clickEndHandler(firstPos, pos);
        } else {
            window.DRAWSTATE.dbgtext = 'STOPPED DRAGGING';
            selectedItem?.dragEndHandler();
        }

    });

    window.requestAnimationFrame(do_the_frame);
});
