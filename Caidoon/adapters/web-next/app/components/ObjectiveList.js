"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ObjectiveList;
const ObjectiveList_module_css_1 = __importDefault(require("./ObjectiveList.module.css"));
function ObjectiveList({ objectives, onObjectiveComplete }) {
    const getObjectiveIcon = (type) => {
        switch (type) {
            case 'collect': return '📦';
            case 'eliminate': return '⚔️';
            case 'interact': return '💬';
            case 'reach': return '📍';
            default: return '✓';
        }
    };
    return (<div className={ObjectiveList_module_css_1.default.container}>
      <h2 className={ObjectiveList_module_css_1.default.heading}>Objectives</h2>
      <div className={ObjectiveList_module_css_1.default.list}>
        {objectives.map((objective) => (<div key={objective.id} className={`${ObjectiveList_module_css_1.default.objective} ${objective.completed ? ObjectiveList_module_css_1.default.completed : ''}`}>
            <div className={ObjectiveList_module_css_1.default.checkbox}>
              {objective.completed ? '✓' : '○'}
            </div>
            <div className={ObjectiveList_module_css_1.default.content}>
              <div className={ObjectiveList_module_css_1.default.header}>
                <span className={ObjectiveList_module_css_1.default.icon}>{getObjectiveIcon(objective.type)}</span>
                <span className={ObjectiveList_module_css_1.default.description}>{objective.description}</span>
              </div>
              {objective.target && (<div className={ObjectiveList_module_css_1.default.details}>
                  Target: {objective.target}
                  {objective.quantity && ` (${objective.quantity})`}
                </div>)}
            </div>
            {!objective.completed && onObjectiveComplete && (<button className={ObjectiveList_module_css_1.default.completeBtn} onClick={() => onObjectiveComplete(objective.id)}>
                Complete
              </button>)}
          </div>))}
      </div>
    </div>);
}
//# sourceMappingURL=ObjectiveList.js.map