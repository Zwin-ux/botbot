"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = NPCDialogue;
const react_1 = require("react");
const NPCDialogue_module_css_1 = __importDefault(require("./NPCDialogue.module.css"));
function NPCDialogue({ npcs }) {
    const [selectedNPC, setSelectedNPC] = (0, react_1.useState)(npcs.length > 0 ? npcs[0].id : null);
    const currentNPC = npcs.find(npc => npc.id === selectedNPC);
    if (npcs.length === 0) {
        return null;
    }
    return (<div className={NPCDialogue_module_css_1.default.container}>
      <h2 className={NPCDialogue_module_css_1.default.heading}>NPCs</h2>
      
      <div className={NPCDialogue_module_css_1.default.npcTabs}>
        {npcs.map((npc) => (<button key={npc.id} className={`${NPCDialogue_module_css_1.default.npcTab} ${selectedNPC === npc.id ? NPCDialogue_module_css_1.default.active : ''}`} onClick={() => setSelectedNPC(npc.id)}>
            <div className={NPCDialogue_module_css_1.default.npcName}>{npc.name}</div>
            <div className={NPCDialogue_module_css_1.default.npcRole}>{npc.role}</div>
          </button>))}
      </div>

      {currentNPC && (<div className={NPCDialogue_module_css_1.default.dialogueBox}>
          <div className={NPCDialogue_module_css_1.default.dialogueHeader}>
            <span className={NPCDialogue_module_css_1.default.dialogueNpcName}>{currentNPC.name}</span>
            <span className={NPCDialogue_module_css_1.default.dialogueNpcRole}>({currentNPC.role})</span>
          </div>
          <div className={NPCDialogue_module_css_1.default.dialogueList}>
            {currentNPC.dialogue.map((line, index) => (<div key={index} className={NPCDialogue_module_css_1.default.dialogueLine}>
                <div className={NPCDialogue_module_css_1.default.trigger}>{line.trigger}</div>
                <div className={NPCDialogue_module_css_1.default.text}>"{line.text}"</div>
              </div>))}
          </div>
        </div>)}
    </div>);
}
//# sourceMappingURL=NPCDialogue.js.map