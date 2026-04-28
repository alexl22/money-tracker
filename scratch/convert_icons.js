const { Jimp } = require('jimp');
const fs = require('fs');

async function convert() {
  try {
    const icon = await Jimp.read('assets/images/icon.jpg');
    await icon.write('assets/images/icon.png');
    console.log('Converted icon.jpg to icon.png');

    const adaptiveIcon = await Jimp.read('assets/images/adaptive-icon.jpg');
    await adaptiveIcon.write('assets/images/adaptive-icon.png');
    console.log('Converted adaptive-icon.jpg to adaptive-icon.png');
  } catch (err) {
    console.error(err);
  }
}

convert();
