import express from 'express';
import { body } from 'express-validator';
import { verifyToken } from '../../middleware/auth';
import { authorize } from '../../middleware/authorize';
import { uploadCampaignAssets } from './campaignUploads';
import { logActivity } from '../../middleware/activityLogger';
import * as controller from './campaigns.controller';

/**
 * Campaign routes (CRUD, updates, milestones, and admin moderation)
 * Handles public access, organizer actions, and admin controls.
 */

const router = express.Router();

router.get('/', controller.getAllCampaigns);
router.get('/my', verifyToken, authorize('organizer', 'admin'), controller.getMyCampaigns);
router.get('/:id', controller.getCampaignById);
router.get('/:campaign_id/updates', controller.getCampaignUpdates);
router.get('/:campaign_id/milestones', controller.getMilestones);

router.post(
  '/',
  verifyToken,
  authorize('organizer'),
  uploadCampaignAssets.fields([
    { name: 'campaign_image', maxCount: 1 },
    { name: 'supporting_documents', maxCount: 8 },
  ]),
  [
    body('title').trim().notEmpty().withMessage('Campaign title is required'),
    body('title').isLength({ max: 150 }).withMessage('Title cannot exceed 150 characters'),
    body('description').trim().notEmpty().withMessage('Campaign description is required'),
    body('description').isLength({ max: 10000 }).withMessage('Description is too long'),
    body('goal_amount').isFloat({ gt: 0 }).withMessage('Goal amount must be greater than 0'),
    body('category')
      .isIn(['medical', 'education', 'funeral', 'emergency', 'community'])
      .withMessage('Invalid campaign category'),
    body('location').optional().isString().isLength({ max: 120 }).withMessage('Location must be 120 characters or fewer'),
    body('story').optional().isString(),
    body('image_url').optional().isString(),
    body('duration_days').optional().isInt({ min: 1 }).withMessage('Duration must be a positive integer'),
    body('bank_account').trim().notEmpty().withMessage('Bank account is required for payout'),
    body('payout_phone')
      .trim()
      .isLength({ min: 10, max: 13 })
      .withMessage('Enter a valid payout phone number'),
  ],
  logActivity('Created campaign'),
  controller.createCampaign
);

router.put(
  '/:id',
  verifyToken,
  authorize('organizer', 'admin'),
  [body('title').optional().trim().notEmpty().withMessage('Campaign title is required')],
  controller.updateCampaign
);
router.delete('/:id', verifyToken, controller.deleteCampaign);
router.post(
  '/:id/updates',
  verifyToken,
  authorize('organizer'),
  [body('content').trim().notEmpty().withMessage('Update content is required')],
  controller.addCampaignUpdate
);
router.post('/milestones', verifyToken, controller.addMilestone);
router.post('/:id/share', controller.recordCampaignShare);
router.patch('/:id/approve', verifyToken, authorize('admin'), logActivity('Approved campaign'), controller.approveCampaign);
router.patch('/:id/reject', verifyToken, authorize('admin'), logActivity('Rejected campaign'), controller.rejectCampaign);
router.patch('/:id/suspend', verifyToken, authorize('admin'), logActivity('Suspended campaign'), controller.suspendCampaign);

export default router;
