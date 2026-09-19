import { User, IUser } from './user.model';
import { Blacklist } from '../kyc/blacklist.model';

export class UserRepository {
  /**
   * Find user by phone number.
   */
  static async findByPhone(phone: string) {
    return User.findOne({ phone });
  }

  /**
   * Find user by salted NID hash.
   */
  static async findByNidHash(nidHash: string) {
    return User.findOne({ nidHash });
  }

  /**
   * Find user by _id.
   */
  static async findById(userId: string) {
    return User.findById(userId);
  }

  /**
   * Create a new user document.
   */
  static async createUser(data: Partial<IUser>) {
    return User.create(data);
  }

  /**
   * Update user's role (e.g., registered → verified).
   */
  static async updateUserRole(userId: string, role: string) {
    return User.findByIdAndUpdate(
      userId,
      { role },
      { new: true }
    );
  }

  /**
   * Update the computed Bayesian trust score.
   */
  static async updateTrustScore(userId: string, score: number) {
    return User.findByIdAndUpdate(
      userId,
      { trustScore: score },
      { new: true }
    );
  }

  /**
   * Query the Blacklist collection to check if any identifier is banned.
   * Returns the matching blacklist entry, or null if not banned.
   */
  static async checkBlacklist(nidHash: string, phoneHash: string, deviceId: string) {
    return Blacklist.findOne({
      $or: [
        { nidHash },
        { phoneHash },
        { deviceId },
      ],
    });
  }
}
