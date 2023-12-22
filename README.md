Scrapbook Image Print Layout
============================

This repo is a tool for my scrapbooking workflow. It's for laying out a grid of 9 images in a 3-by-3 grid, each to be printed as a 2inch x 3inch image. I made this because when scrapbooking, we prefer 2inch by 3inch images, but actually generating these 2x3 images at home via printing is a pain. Some problems include:

- We want to conserve the nice printer paper we used to print these images on, so we try to fit as many images on a page at once. For 8.5x11 paper, that's a 3x3 grid of 2x3 images
- Cropping images down so that they display at PRECISELY 2x3 inches once printed is super annoying in many image-editing suites of software, without paying for fancy things like Photoshop and getting training and printing with just the right settings
- Once printed, we want our images to be arranged on a rigid grid so that we can use a straight-line papercut to trim the remaining paper. If you are trying to do this in e.g. Powerpoint (a common tool "poor-mans's layout engine"), you'll often end up with imperfect grids even though there is alignment help.


Hence this program. Through trial and error, we found that a 3000x4000 pixel PNG with 9 sub-images, each 800x1200, when printed on a Windows computer (or most "simple image viewers" on most OSes) will have each image come out of our printer at 2x3 inches in size and with enough detail for our purposes.

------------

This program makes that grid-layout process easy. Supported features include:

- Scale images
- Rotate images
- Crop down to EXACTLY 2x3 in a rigid pixel-perfect grid


