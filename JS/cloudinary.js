// Cloudinary Config
const CLOUD_NAME = "cfnqmyif"; 
const UPLOAD_PRESET = "librax"; 

export async function uploadImageToCloudinary(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await response.json();
    if (data.secure_url) {
      return data.secure_url; 
    } else {
      console.error("Cloudinary upload error:", data);
      return null;
    }
  } catch (error) {
    console.error("Error uploading image to Cloudinary:", error);
    return null;
  }
}