import ImageKit from "imagekit";
import dotenv from "dotenv";

dotenv.config();

const IMAGEKIT_PUBLIC_KEY="public_1DQwUHCjd9/7x7rVZr4C0kXsnlE="
const IMAGEKIT_PRIVATE_KEY="private_7zJXB8YxDw/pwqO9mGTEk11bJDo="
const IMAGEKIT_ENDPOINT="https://ik.imagekit.io/apo3bb1ur"

const imagekit = new ImageKit({
    publicKey: IMAGEKIT_PUBLIC_KEY,
    privateKey: IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: IMAGEKIT_ENDPOINT
});

export default imagekit;
