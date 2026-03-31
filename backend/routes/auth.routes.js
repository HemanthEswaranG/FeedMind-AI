const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { register, login, getMe, googleAuth, uploadAvatar, removeAvatar } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

const avatarUploadDir = path.join(__dirname, '..', 'uploads', 'avatars');
fs.mkdirSync(avatarUploadDir, { recursive: true });

const avatarStorage = multer.diskStorage({
	destination: (req, file, cb) => cb(null, avatarUploadDir),
	filename: (req, file, cb) => {
		const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
		cb(null, `${unique}${path.extname(file.originalname).toLowerCase()}`);
	},
});

const avatarFileFilter = (req, file, cb) => {
	if (file.mimetype.startsWith('image/')) {
		cb(null, true);
	} else {
		cb(new Error('Only image files are allowed'), false);
	}
};

const avatarUpload = multer({
	storage: avatarStorage,
	fileFilter: avatarFileFilter,
	limits: { fileSize: 5 * 1024 * 1024 },
});

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);
router.get('/me', protect, getMe);
router.post('/me/avatar', protect, avatarUpload.single('avatar'), uploadAvatar);
router.delete('/me/avatar', protect, removeAvatar);

module.exports = router;
