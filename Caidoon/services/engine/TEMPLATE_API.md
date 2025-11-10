# Template API Documentation

The Template API provides endpoints for working with pre-built encounter templates.

## Endpoints

### GET /templates

List all available encounter templates.

**Response:**
```json
{
  "templates": [
    {
      "id": "combat-ambush",
      "name": "Ambush Encounter",
      "category": "combat",
      "description": "A surprise attack by enemies requiring quick tactical response",
      "difficulty": "medium",
      "estimatedDuration": 15,
      "customizableFields": ["enemy_type", "enemy_count", "xp_reward", "gold_reward"],
      "requiredFields": ["enemy_type", "enemy_count"],
      "tags": ["combat", "action", "quick", "tactical"]
    }
  ],
  "count": 5
}
```

### GET /templates/:id

Get a specific template by ID.

**Example:** `GET /templates/combat-ambush`

**Response:**
```json
{
  "id": "combat-ambush",
  "name": "Ambush Encounter",
  "category": "combat",
  "description": "A surprise attack by enemies requiring quick tactical response",
  "difficulty": "medium",
  "estimatedDuration": 15,
  "structure": {
    "title": "Ambush!",
    "description": "You are suddenly ambushed by {{enemy_type}}!",
    "objectives": [...],
    "npcs": [],
    "rewards": [...]
  },
  "customizableFields": ["enemy_type", "enemy_count", "xp_reward", "gold_reward"],
  "requiredFields": ["enemy_type", "enemy_count"],
  "tags": ["combat", "action", "quick", "tactical"]
}
```

### POST /templates/:id/generate

Generate a complete encounter from a template.

**Example:** `POST /templates/combat-ambush/generate`

**Request Body:**
```json
{
  "parameters": {
    "enemy_type": "bandits",
    "enemy_count": 5,
    "xp_reward": 100,
    "gold_reward": 50
  },
  "playerContext": {
    "level": 5,
    "preferences": ["combat", "action"]
  }
}
```

**Response:** (201 Created)
```json
{
  "id": "encounter_1234567890",
  "title": "Ambush!",
  "description": "You are suddenly ambushed by bandits!",
  "objectives": [
    {
      "id": "obj_defeat_enemies",
      "description": "Defeat all 5 bandits",
      "type": "eliminate",
      "target": "bandits",
      "quantity": 5,
      "completed": false
    }
  ],
  "npcs": [],
  "rewards": [
    {
      "type": "experience",
      "amount": 100
    },
    {
      "type": "currency",
      "amount": 50
    }
  ],
  "difficulty": "medium",
  "estimatedDuration": 15
}
```

## Available Templates

1. **combat-ambush** - Surprise attack encounter
2. **puzzle-riddle** - Logic and problem-solving challenge
3. **social-negotiation** - Diplomatic persuasion encounter
4. **exploration-discovery** - Exploration and discovery mission
5. **stealth-infiltration** - Covert operation requiring stealth

## Error Responses

### 404 Not Found
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Template not found: invalid-id",
    "requestId": "req_123"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 400 Validation Error
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Template generation validation failed",
    "details": {
      "errors": ["Required field 'enemy_count' is missing"],
      "missingFields": ["enemy_count"]
    },
    "requestId": "req_123"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Usage Example

```bash
# List all templates
curl http://localhost:8786/templates

# Get specific template
curl http://localhost:8786/templates/combat-ambush

# Generate encounter from template
curl -X POST http://localhost:8786/templates/combat-ambush/generate \
  -H "Content-Type: application/json" \
  -d '{
    "parameters": {
      "enemy_type": "orcs",
      "enemy_count": 3,
      "xp_reward": 150,
      "gold_reward": 75
    }
  }'
```
