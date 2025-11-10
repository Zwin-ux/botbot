"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = RewardsDisplay;
const RewardsDisplay_module_css_1 = __importDefault(require("./RewardsDisplay.module.css"));
function RewardsDisplay({ rewards }) {
    const getRewardIcon = (type) => {
        switch (type) {
            case 'currency': return '💰';
            case 'item': return '🎁';
            case 'experience': return '⭐';
            default: return '🏆';
        }
    };
    const getRewardLabel = (reward) => {
        switch (reward.type) {
            case 'currency':
                return `${reward.amount} Gold`;
            case 'item':
                return reward.itemId ? `${reward.itemId} (x${reward.amount})` : `Item x${reward.amount}`;
            case 'experience':
                return `${reward.amount} XP`;
            default:
                return `${reward.amount}`;
        }
    };
    if (rewards.length === 0) {
        return null;
    }
    return (<div className={RewardsDisplay_module_css_1.default.container}>
      <h2 className={RewardsDisplay_module_css_1.default.heading}>Rewards</h2>
      <div className={RewardsDisplay_module_css_1.default.rewardsList}>
        {rewards.map((reward, index) => (<div key={index} className={RewardsDisplay_module_css_1.default.reward}>
            <span className={RewardsDisplay_module_css_1.default.icon}>{getRewardIcon(reward.type)}</span>
            <div className={RewardsDisplay_module_css_1.default.details}>
              <div className={RewardsDisplay_module_css_1.default.label}>{getRewardLabel(reward)}</div>
              <div className={RewardsDisplay_module_css_1.default.type}>{reward.type}</div>
            </div>
          </div>))}
      </div>
    </div>);
}
//# sourceMappingURL=RewardsDisplay.js.map