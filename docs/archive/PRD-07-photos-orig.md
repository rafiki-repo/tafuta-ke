# Tafuta Photos - PRD
 - Each business will get a human readable id tag. For example "hevin" or "daniels-salon". This plus the uuid will be used to generate a unique folder/URL for the business. Format: <business_id>-<uuid>
 - Business ids must be unique. They will be stored in the business table in the database
 - If someone updates their business id, then the folder name will have to be updated as well. (I know that is a pain, sorry). 
 - There will be a flex-json config for the app; app-config.jfx. It will include a list of image_types and a list of sizes per image_type. Each size will have a tag for identification. This can be a name such as "icon" or dimensions such as "150x100".
 - User will upload photos by business, and type. Each photo will get a name that must be unique within that business. The system will create a file-friendly name from the user input name and store both. For example "Daniel's profile image" might become "daniel-s-profile-image". 
 - Image upload type may be jpg, png, gif, or webp.
 - There will be a folder per buisness per type. In it will be tranformation specs per image that was uploaded for that type. They will be stored in a flex-json file. For example daniels-salon-banner-1.jfx
 - For each .jfx file the system will transform the image and produce a set of .webp images per size specified in the app-config.jfx.
 - The website will only reference the transformed .webp images.
 - Folder structure will be:
 /var/www/tafuta-media/
└── businesses/
    └── {business_id}-{uuid}
        ├── city-view.jpg
        ├── cover-banner.gif
        ├── etc...
        └── banner/
            ├── cover-banner.jfx
            ├── cover-banner_150x100.webp
            └── etc...
        └── profile/
            ├── city-view.jfx
            ├── city-view_icon.webp
            ├── city-view_small.webp
            ├── city-view_large.webp
            └── etc...
- System will delete the transformed .webp files whenever there is a change to the source image or the .jfx... and re-transform. 
- During upload the user can specify the banner title. If there is a conflict with an existing file (same name or same generated tag-id) the system will append a number to the end of the name. For example "banner-1" or "banner-2". It will warn the user that the name was changed.
- The app-config.jfx will also include a max number of images per business per type. For example 3 banner images and 5 profile images and 10 product images. If a user tries to upload more than the max, the system will warn them and not allow the upload. The user can delete an image to make room for a new one.
- During the MVP the image_type is determined at the time of upload. A single image cannot be both a product image and a banner image... for example. However, they can upload the same image twice, once for each type - and the system will append the "-2" to the end of the name of one image.
- The system will allow the user to tranform the image on the front end by providing a small preview with the same ratio as the target size for the image_type. The user will have the following parameters:
    - zoom in-out
    - offset x
    - offset y
    - rotation
    - flip horizontal
    - flip vertical
    - brightness (and darkness)
    - contrast
    - saturation
- The front-end will use JIMP to transform the image on the fly. Only the parameters will be save in the .jfx file.
- The backend will also use JIMP and the provided parameters to transform the image and save it in each specified size.
- In the profile itself, only the image-tag will be needed to specify which image to display. The system will use the business name/id and the image-tag and the context (ie. displaying the banner will looking in the banner folder) and the size needed for that context to piece together the correct url to the image.