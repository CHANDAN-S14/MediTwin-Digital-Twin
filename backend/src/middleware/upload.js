import multer from 'multer';

const storage =
  multer.memoryStorage();


const upload =
  multer({

    storage,

    limits: {
      fileSize:
        10 * 1024 * 1024,
    },

    fileFilter:
      (_req, file, cb) => {

        if (
          file.mimetype.startsWith(
            'image/'
          )
        ) {

          cb(
            null,
            true
          );

        } else {

          cb(
            new Error(
              'Only image files are allowed'
            )
          );

        }

      },

  });


export const handleUpload =
  upload.single('image');