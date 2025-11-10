"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = EncounterDisplay;
const EncounterDisplay_module_css_1 = __importDefault(require("./EncounterDisplay.module.css"));
function EncounterDisplay({ encounter }) {
    const difficultyColors = {
        easy: '#4ade80',
        medium: '#fbbf24',
        hard: '#f87171',
    };
    return (<div className={EncounterDisplay_module_css_1.default.container}>
      <div className={EncounterDisplay_module_css_1.default.header}>
        <h1 className={EncounterDisplay_module_css_1.default.title}>{encounter.title}</h1>
        <div className={EncounterDisplay_module_css_1.default.meta}>
          <span className={EncounterDisplay_module_css_1.default.difficulty} style={{ color: difficultyColors[encounter.difficulty] }}>
            {encounter.difficulty.toUpperCase()}
          </span>
          <span className={EncounterDisplay_module_css_1.default.duration}>
            ~{encounter.estimatedDuration} min
          </span>
        </div>
      </div>
      <p className={EncounterDisplay_module_css_1.default.description}>{encounter.description}</p>
    </div>);
}
//# sourceMappingURL=EncounterDisplay.js.map