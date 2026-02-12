# NFT Metadata Standards Reference

This document provides detailed specifications for different NFT metadata standards, including format requirements, field definitions, and real-world examples.

---

## Table of Contents

1. [Enjin Blockchain Metadata Standard](#1-enjin-blockchain-metadata-standard)
2. [ERC-721 Metadata Standard (OpenSea)](#2-erc-721-metadata-standard-opensea)
3. [ERC-1155 Metadata Standard](#3-erc-1155-metadata-standard)
4. [Ethereum Name Service (ENS) Metadata](#4-ethereum-name-service-ens-metadata)
5. [Solana Metaplex Metadata](#5-solana-metaplex-metadata)
6. [Flow NFT Metadata](#6-flow-nft-metadata)
7. [Tezos TZIP-21 Metadata](#7-tezos-tzip-21-metadata)
8. [Comparison Table](#8-comparison-table)
9. [Validation Rules](#9-validation-rules)

---

## 1. Enjin Blockchain Metadata Standard

### Overview
Enjin uses a comprehensive metadata standard designed for gaming assets and multiverse items. The standard supports both collection-level and token-level metadata.

**Important Notes:**
- Attribute keys are **case-sensitive**
- On-chain attributes take precedence over off-chain attributes
- The `uri` attribute can point to a JSON resource containing metadata, or individual metadata can be set as on-chain attributes

### Collection Metadata

#### Required Fields
- `name` - Collection's display name
- `description` - Collection's description

#### Optional Fields
- `media` - Array of media file objects (images, videos, etc.)
- `banner_image` - Collection banner image URL (recommended ratio: 4:1)
- `fallback_image` - Alternative image when media fails to load
- `external_url` - Link to collection's website

#### Collection JSON Schema

```json
{
  "name": "string",
  "description": "string",
  "media": [
    {
      "url": "string (URL)",
      "type": "string (MIME type)"
    }
  ],
  "banner_image": "string (URL)",
  "fallback_image": "string (URL)",
  "external_url": "string (URL)"
}
```

### Token Metadata

#### Required Fields
- `name` - Token's display name
- `description` - Token's description

#### Optional Fields
- `media` - Array of media file objects (images, videos, 3D models)
- `fallback_image` - Alternative image when media fails to load
- `attributes` - Object containing custom token properties
- `external_url` - Link to token's website or information page
- `keywords` - Array of keywords for search and categorization

#### Token JSON Schema

```json
{
  "name": "string",
  "description": "string",
  "media": [
    {
      "url": "string (URL)",
      "type": "string (MIME type)"
    }
  ],
  "fallback_image": "string (URL)",
  "attributes": {
    "attribute_name": {
      "value": "string | number"
    }
  },
  "external_url": "string (URL)",
  "keywords": ["string"]
}
```

### Example: Collection Metadata (The Multiverse)

```json
{
  "name": "The Multiverse",
  "description": "A blockchain gaming multiverse is a collective gaming reality created by integrating a collection of blockchain assets with multiple games. In other words, a gaming multiverse is a collaborative gaming project where multiple game developers agree to use the same shared, decentralized database for some (or even all) of their in-game assets.\nThis enables gamers to utilize a multiverse asset in every game that is a part of a specific gaming multiverse (e.g., if a player owns a sword in Game A, they will also own it and can use it in Game B). In-game assets in a blockchain gaming multiverse are owned by gamers, while individual game developers control only the games they create.\nThe Enjin Multiverse is the first blockchain gaming multiverse ever.\nIt was announced on August 26, 2018, when six games (9Lives Arena, Age of Rust, Bitcoin Hodler, CryptoFights, Forest Knight, and War of Crypta) decided to collaborate and implement the first shared blockchain assets.\nIt has since grown to over 30 games.",
  "media": [
    {
      "url": "https://cdn.enjinx.io/assets/images/ethereum/platform/0/apps/8/2b728df41fadef568e4410fb823999d14473ef1e.jpeg",
      "type": "image/jpeg"
    },
    {
      "url": "https://cdn.enjin.io/mint/image/15.jpg",
      "type": "image/jpg"
    }
  ],
  "banner_image": "https://platform.production.enjinusercontent.com/enterprise/enjin/assets/media/2024-multiverse.banner.jpg",
  "fallback_image": "https://cdn.enjin.io/mint/image/15.jpg",
  "external_url": "https://enjin.io/multiverse"
}
```

### Example: Token Metadata (Primythical Chest)

```json
{
  "name": "Primythical Chest",
  "description": "As written in the fourth edition of 'Book of the Ruindawn', Primythical Chests contain fabled treasures, and are hidden through a myriad of universes by the Creators of Realms themselves—the Architects.\nThe wood-and-iron vaults are shrouded by the veils of time and space—and can only be found by the most courageous and intelligent Wanderers.",
  "media": [
    {
      "url": "https://cdn.enjin.io/mint/images/50000000000000c3.jpg",
      "type": "image/jpg"
    },
    {
      "url": "https://cdn.enjin.io/mint/videos/chest.mp4",
      "type": "video/mp4"
    },
    {
      "url": "https://cdn.enjin.io/mint/models/chest.glb",
      "type": "model/gltf-binary"
    }
  ],
  "fallback_image": "https://cdn.enjin.io/mint/images/50000000000000c3.jpg",
  "attributes": {
    "Usable In": {
      "value": "Lost Relics, Etherscape, Axiomech"
    },
    "Artifact Rarity": {
      "value": "Common"
    }
  },
  "external_url": "https://enjin.io/multiverse",
  "keywords": [
    "Multiverse Item",
    "Key",
    "Free"
  ]
}
```

### Example: Gaming Weapon

```json
{
  "name": "Legendary Sword of Fire",
  "description": "A powerful blade forged in the heart of a volcano. Deals 150 fire damage and grants the wielder immunity to flame-based attacks.",
  "media": [
    {
      "url": "https://cdn.enjin.io/weapons/legendary-sword.jpg",
      "type": "image/jpg"
    },
    {
      "url": "https://cdn.enjin.io/weapons/legendary-sword.mp4",
      "type": "video/mp4"
    },
    {
      "url": "https://cdn.enjin.io/weapons/legendary-sword.glb",
      "type": "model/gltf-binary"
    }
  ],
  "fallback_image": "https://cdn.enjin.io/weapons/legendary-sword.jpg",
  "attributes": {
    "Attack Power": {
      "value": 150
    },
    "Durability": {
      "value": 1000
    },
    "Element": {
      "value": "Fire"
    },
    "Rarity": {
      "value": "Legendary"
    },
    "Level Requirement": {
      "value": 50
    },
    "Usable In": {
      "value": "Forest Knight, War of Crypta, Age of Rust"
    }
  },
  "keywords": [
    "Weapon",
    "Sword",
    "Legendary",
    "Fire",
    "Multiverse"
  ]
}
```

### Example: Character Skin

```json
{
  "name": "Dark Knight Armor Set",
  "description": "Legendary armor set worn by the Knights of the Shadow Realm. Grants the wearer enhanced defense and shadow resistance.",
  "media": [
    {
      "url": "https://cdn.enjin.io/armor/dark-knight.png",
      "type": "image/png"
    },
    {
      "url": "https://cdn.enjin.io/armor/dark-knight-3d.glb",
      "type": "model/gltf-binary"
    }
  ],
  "fallback_image": "https://cdn.enjin.io/armor/dark-knight.png",
  "attributes": {
    "Armor Type": {
      "value": "Heavy"
    },
    "Defense Rating": {
      "value": 200
    },
    "Weight": {
      "value": 45
    },
    "Set Bonus": {
      "value": "Shadow Resistance +50%"
    },
    "Equipment Slots": {
      "value": "Helmet, Chest, Legs, Boots"
    },
    "Class Restriction": {
      "value": "Warrior"
    },
    "Usable In": {
      "value": "9Lives Arena, CryptoFights, Etherscape"
    }
  },
  "keywords": [
    "Armor",
    "Heavy Armor",
    "Set",
    "Legendary",
    "Multiverse"
  ]
}
```

### Media Array Notes

**Supported Media Types:**
- Images: `image/jpg`, `image/jpeg`, `image/png`, `image/gif`, `image/webp`
- Videos: `video/mp4`, `video/webm`
- 3D Models: `model/gltf-binary` (GLB)

**Display Behavior:**
- On Enjin Wallet and NFT.io marketplace, when multiple media files are provided, the media is scrollable
- The first media file in the array is used as the featured/primary media
- `fallback_image` should be hosted on a different server for redundancy
- `fallback_image` displays when primary media fails to load or is unsupported (e.g., 3D models in 2D views)

### Attributes Object Notes

**Structure:**
- Attributes use a nested object structure, not an array
- Each attribute has a name (key) and a value object
- Attribute names are displayed as-is in marketplaces and wallets

**Example:**
```json
"attributes": {
  "Damage Type": {
    "value": "Fire"
  },
  "Attack Speed": {
    "value": 1.5
  }
}
```

**Use Cases:**
- Game stats (attack, defense, speed)
- Rarity indicators
- Cross-game compatibility lists
- Equipment requirements
- Special abilities or effects

---

## 2. ERC-721 Metadata Standard (OpenSea)

### Overview
The most widely adopted NFT metadata standard, popularized by OpenSea and CryptoKitties.

### Required Fields
- `name` - Name of the NFT
- `description` - Description of the NFT
- `image` - Image URL

### Optional Fields
- `external_url` - URL to view item on your site
- `attributes` - Array of trait objects
- `background_color` - Six-character hex (no #)
- `animation_url` - URL to multimedia attachment
- `youtube_url` - YouTube video URL

### JSON Schema

```json
{
  "name": "string",
  "description": "string",
  "image": "string (URL)",
  "external_url": "string (URL)",
  "attributes": [
    {
      "trait_type": "string",
      "value": "string | number",
      "display_type": "number | boost_percentage | boost_number | date",
      "max_value": "number (optional)"
    }
  ],
  "background_color": "string (hex without #)",
  "animation_url": "string (URL)",
  "youtube_url": "string (URL)"
}
```

### Example: Digital Art NFT

```json
{
  "name": "Cosmic Dreams #42",
  "description": "An abstract exploration of the universe through vibrant colors and geometric patterns. Part of the Cosmic Dreams collection.",
  "image": "ipfs://QmPAg1mjxcEQPPtqsLoEcauVedaeMH81WXDPvPx3VC5zUz",
  "external_url": "https://cosmicart.io/dreams/42",
  "attributes": [
    {
      "trait_type": "Artist",
      "value": "Luna Chen"
    },
    {
      "trait_type": "Style",
      "value": "Abstract"
    },
    {
      "trait_type": "Color Palette",
      "value": "Vibrant"
    },
    {
      "trait_type": "Rarity",
      "value": "Legendary"
    },
    {
      "trait_type": "Edition",
      "value": 42,
      "max_value": 100
    },
    {
      "trait_type": "Creation Date",
      "value": 1704067200,
      "display_type": "date"
    }
  ],
  "background_color": "1a1a2e"
}
```

### Example: NFT with Animation

```json
{
  "name": "CyberPunk Avatar #1337",
  "description": "A procedurally generated cyberpunk character with unique traits and abilities.",
  "image": "https://gateway.pinata.cloud/ipfs/QmHash/1337.png",
  "external_url": "https://cyberpunkavatars.com/avatar/1337",
  "animation_url": "https://gateway.pinata.cloud/ipfs/QmHash/1337.mp4",
  "attributes": [
    {
      "trait_type": "Background",
      "value": "Neon City"
    },
    {
      "trait_type": "Body",
      "value": "Cybernetic"
    },
    {
      "trait_type": "Eyes",
      "value": "LED Blue"
    },
    {
      "trait_type": "Outfit",
      "value": "Tech Jacket"
    },
    {
      "trait_type": "Accessory",
      "value": "Neural Implant"
    },
    {
      "trait_type": "Power Level",
      "value": 9001,
      "display_type": "number"
    },
    {
      "trait_type": "Speed Boost",
      "value": 25,
      "display_type": "boost_percentage"
    }
  ],
  "background_color": "0f0f23"
}
```

### Example: PFP (Profile Picture) NFT

```json
{
  "name": "Bored Ape #5234",
  "description": "A unique Bored Ape with rare traits from the Bored Ape Yacht Club collection.",
  "image": "ipfs://QmeSjSinHpPnmXmspMjwiXyN6zS4E9zccariGR3jxcaWtq/5234",
  "external_url": "https://boredapeyachtclub.com/#/gallery/5234",
  "attributes": [
    {
      "trait_type": "Background",
      "value": "Army Green"
    },
    {
      "trait_type": "Fur",
      "value": "Golden Brown"
    },
    {
      "trait_type": "Eyes",
      "value": "Laser Eyes"
    },
    {
      "trait_type": "Mouth",
      "value": "Bored Cigarette"
    },
    {
      "trait_type": "Hat",
      "value": "Party Hat"
    },
    {
      "trait_type": "Clothes",
      "value": "Smoking Jacket"
    }
  ]
}
```

### Example: Music NFT

```json
{
  "name": "Synthwave Dreams - Track 01",
  "description": "An original synthwave composition blending 80s nostalgia with modern production.",
  "image": "https://arweave.net/album-cover-hash",
  "external_url": "https://musicnft.io/tracks/synthwave-dreams-01",
  "animation_url": "https://arweave.net/audio-file-hash.mp3",
  "youtube_url": "https://youtube.com/watch?v=example",
  "attributes": [
    {
      "trait_type": "Genre",
      "value": "Synthwave"
    },
    {
      "trait_type": "Artist",
      "value": "Neon Pulse"
    },
    {
      "trait_type": "BPM",
      "value": 128,
      "display_type": "number"
    },
    {
      "trait_type": "Duration",
      "value": "4:32"
    },
    {
      "trait_type": "Release Date",
      "value": 1704153600,
      "display_type": "date"
    },
    {
      "trait_type": "Edition",
      "value": "1/10"
    }
  ],
  "background_color": "ff6ec7"
}
```

---

## 3. ERC-1155 Metadata Standard

### Overview
Multi-token standard supporting both fungible and non-fungible tokens in a single contract.

### Required Fields
- `name` - Token name
- `description` - Token description  
- `image` - Image URL

### Optional Fields
- `decimals` - Decimal places (for fungible tokens)
- `properties` - Custom properties object
- `localization` - Multi-language support
- `attributes` - Array of traits (similar to ERC-721)

### JSON Schema

```json
{
  "name": "string",
  "description": "string",
  "image": "string (URL)",
  "decimals": 0,
  "properties": {
    "custom_field": "value"
  },
  "attributes": [
    {
      "trait_type": "string",
      "value": "string | number"
    }
  ],
  "localization": {
    "uri": "string (URL pattern)",
    "default": "string (locale code)",
    "locales": ["array of locale codes"]
  }
}
```

### Example: Gaming Item (Semi-Fungible)

```json
{
  "name": "Health Potion",
  "description": "Restores 50 HP when consumed. Stackable consumable item.",
  "image": "ipfs://QmHash/health-potion.png",
  "decimals": 0,
  "properties": {
    "item_type": "consumable",
    "stackable": true,
    "max_stack": 99,
    "healing_amount": 50,
    "cooldown": 5,
    "tradeable": true
  },
  "attributes": [
    {
      "trait_type": "Type",
      "value": "Consumable"
    },
    {
      "trait_type": "Effect",
      "value": "Healing"
    },
    {
      "trait_type": "Rarity",
      "value": "Common"
    }
  ]
}
```

### Example: Virtual Land Parcel

```json
{
  "name": "Metaverse Plot #42-17",
  "description": "Premium land parcel in the downtown district with ocean view.",
  "image": "ipfs://QmHash/plot-42-17.png",
  "properties": {
    "coordinates": {
      "x": 42,
      "y": 17
    },
    "size": "256x256",
    "district": "Downtown",
    "view": "Ocean",
    "tier": "Premium",
    "buildable_height": 100,
    "adjacent_plots": 4
  },
  "attributes": [
    {
      "trait_type": "District",
      "value": "Downtown"
    },
    {
      "trait_type": "Size",
      "value": "Large"
    },
    {
      "trait_type": "View",
      "value": "Ocean"
    },
    {
      "trait_type": "Traffic",
      "value": "High"
    }
  ]
}
```

### Example: Fractional Art Share

```json
{
  "name": "Mona Lisa Fraction #157",
  "description": "1/1000th ownership share of the digitized Mona Lisa NFT.",
  "image": "https://arweave.net/mona-lisa-hash",
  "decimals": 0,
  "properties": {
    "total_fractions": 1000,
    "fraction_id": 157,
    "original_artist": "Leonardo da Vinci",
    "digitization_date": "2024-01-15",
    "share_percentage": 0.1,
    "voting_rights": true,
    "dividend_eligible": true
  },
  "attributes": [
    {
      "trait_type": "Share Number",
      "value": 157,
      "max_value": 1000
    },
    {
      "trait_type": "Ownership Percentage",
      "value": 0.1,
      "display_type": "boost_percentage"
    }
  ]
}
```

---

## 4. Ethereum Name Service (ENS) Metadata

### Overview
Metadata standard for ENS domain names, focusing on identity and web3 profiles.

### Required Fields
- `name` - ENS domain name
- `description` - Description of the domain
- `image` - Avatar/profile image

### Optional Fields
- `url` - Associated website URL
- `attributes` - Domain characteristics
- `background_image` - Profile background image

### JSON Schema

```json
{
  "name": "string (ENS name)",
  "description": "string",
  "image": "string (URL)",
  "url": "string (URL)",
  "attributes": [
    {
      "trait_type": "string",
      "value": "string | number"
    }
  ],
  "background_image": "string (URL)"
}
```

### Example: ENS Domain

```json
{
  "name": "vitalik.eth",
  "description": "Primary ENS domain for Vitalik Buterin, Ethereum co-founder",
  "image": "https://metadata.ens.domains/mainnet/avatar/vitalik.eth",
  "url": "https://vitalik.ca",
  "attributes": [
    {
      "trait_type": "Length",
      "value": 7
    },
    {
      "trait_type": "Segment Count",
      "value": 1
    },
    {
      "trait_type": "Character Set",
      "value": "Latin"
    },
    {
      "trait_type": "Registration Date",
      "value": 1493400000,
      "display_type": "date"
    },
    {
      "trait_type": "Expiration Date",
      "value": 1746057600,
      "display_type": "date"
    }
  ],
  "background_image": "https://metadata.ens.domains/mainnet/background/vitalik.eth"
}
```

### Example: Premium ENS Domain

```json
{
  "name": "crypto.eth",
  "description": "Premium single-word ENS domain name",
  "image": "https://metadata.ens.domains/mainnet/0x123.../image",
  "attributes": [
    {
      "trait_type": "Length",
      "value": 6
    },
    {
      "trait_type": "Type",
      "value": "Premium"
    },
    {
      "trait_type": "Character Set",
      "value": "Latin"
    },
    {
      "trait_type": "Category",
      "value": "Technology"
    }
  ]
}
```

---

## 5. Solana Metaplex Metadata

### Overview
Metaplex is the dominant NFT standard on Solana, featuring on-chain and off-chain metadata.

### On-Chain Metadata Fields
- `name` - Token name (max 32 chars)
- `symbol` - Token symbol (max 10 chars)
- `uri` - Off-chain metadata URI
- `seller_fee_basis_points` - Royalty percentage (0-10000)
- `creators` - Array of creator addresses and shares

### Off-Chain Metadata Fields
- `name` - Full token name
- `description` - Token description
- `image` - Image URL
- `animation_url` - Animation URL (optional)
- `external_url` - External URL (optional)
- `attributes` - Array of traits
- `properties` - Additional properties object

### JSON Schema

```json
{
  "name": "string",
  "symbol": "string",
  "description": "string",
  "image": "string (URL)",
  "animation_url": "string (URL)",
  "external_url": "string (URL)",
  "seller_fee_basis_points": 500,
  "attributes": [
    {
      "trait_type": "string",
      "value": "string | number"
    }
  ],
  "properties": {
    "category": "image | video | audio | vr | html",
    "files": [
      {
        "uri": "string (URL)",
        "type": "string (MIME type)"
      }
    ],
    "creators": [
      {
        "address": "string (Solana address)",
        "share": 100
      }
    ]
  },
  "collection": {
    "name": "string",
    "family": "string"
  }
}
```

### Example: Solana NFT

```json
{
  "name": "Degen Ape #4321",
  "symbol": "DAPE",
  "description": "A unique Degen Ape from the Academy collection on Solana",
  "image": "https://arweave.net/abc123/4321.png",
  "external_url": "https://degenapeacademy.com/ape/4321",
  "seller_fee_basis_points": 500,
  "attributes": [
    {
      "trait_type": "Background",
      "value": "Purple"
    },
    {
      "trait_type": "Fur",
      "value": "Gold"
    },
    {
      "trait_type": "Eyes",
      "value": "3D Glasses"
    },
    {
      "trait_type": "Mouth",
      "value": "Smile"
    },
    {
      "trait_type": "Clothes",
      "value": "Tuxedo"
    },
    {
      "trait_type": "Hat",
      "value": "Crown"
    }
  ],
  "properties": {
    "category": "image",
    "files": [
      {
        "uri": "https://arweave.net/abc123/4321.png",
        "type": "image/png"
      }
    ],
    "creators": [
      {
        "address": "9aXqZU6KwqzEKmMH1zEqM8RJiMdHpZH6aPnEfWqV3DK3",
        "share": 100
      }
    ]
  },
  "collection": {
    "name": "Degen Ape Academy",
    "family": "Degen Apes"
  }
}
```

### Example: Solana Compressed NFT (cNFT)

```json
{
  "name": "Compressed Tree #9876",
  "symbol": "CTREE",
  "description": "Energy-efficient NFT stored using Solana's State Compression",
  "image": "https://arweave.net/compressed-tree-9876",
  "attributes": [
    {
      "trait_type": "Tree Type",
      "value": "Oak"
    },
    {
      "trait_type": "Season",
      "value": "Autumn"
    },
    {
      "trait_type": "Height",
      "value": 25,
      "display_type": "number"
    }
  ],
  "properties": {
    "category": "image",
    "files": [
      {
        "uri": "https://arweave.net/compressed-tree-9876.png",
        "type": "image/png"
      }
    ],
    "creators": [
      {
        "address": "TreeCreator1111111111111111111111111111111",
        "share": 80
      },
      {
        "address": "Collaborator2222222222222222222222222222",
        "share": 20
      }
    ],
    "compression": {
      "eligible": true,
      "compressed": true,
      "data_hash": "hash123",
      "creator_hash": "hash456",
      "asset_hash": "hash789",
      "tree": "TreeAddress111111111111111111111111111",
      "seq": 9876,
      "leaf_id": 9875
    }
  },
  "collection": {
    "name": "Compressed Nature",
    "family": "cNFT Collections"
  }
}
```

---

## 6. Flow NFT Metadata

### Overview
Flow blockchain metadata standard used by NBA Top Shot, NFL All Day, and other major projects.

### Required Fields
- `name` - NFT name
- `description` - NFT description
- `thumbnail` - Thumbnail image URL

### Optional Fields
- `metadata` - Custom metadata object
- `edition` - Edition information
- `traits` - Array of trait objects

### JSON Schema

```json
{
  "name": "string",
  "description": "string",
  "thumbnail": "string (URL)",
  "metadata": {
    "custom_field": "value"
  },
  "edition": {
    "number": 0,
    "max": 0
  },
  "traits": [
    {
      "name": "string",
      "value": "string | number"
    }
  ]
}
```

### Example: NBA Top Shot Moment

```json
{
  "name": "LeBron James Cosmic Dunk",
  "description": "LeBron James' incredible dunk from the 2024 Finals Game 7",
  "thumbnail": "https://assets.nbatopshot.com/editions/1_lebron_cosmic_dunk/thumbnail.png",
  "metadata": {
    "player": "LeBron James",
    "team": "Los Angeles Lakers",
    "date": "2024-06-20",
    "game": "Finals Game 7",
    "quarter": 4,
    "time_remaining": "0:45",
    "opponent": "Boston Celtics",
    "play_type": "Dunk",
    "tier": "Legendary"
  },
  "edition": {
    "number": 42,
    "max": 100
  },
  "traits": [
    {
      "name": "Series",
      "value": "Series 4"
    },
    {
      "name": "Set",
      "value": "Cosmic"
    },
    {
      "name": "Tier",
      "value": "Legendary"
    },
    {
      "name": "Badge",
      "value": "Championship"
    }
  ]
}
```

### Example: Flow Art NFT

```json
{
  "name": "Digital Dreamscape #15",
  "description": "An immersive digital art piece exploring the boundaries between reality and imagination",
  "thumbnail": "https://ipfs.io/ipfs/QmHash/thumbnail.jpg",
  "metadata": {
    "artist": "Alex Rivers",
    "medium": "Digital",
    "dimensions": "4096x4096",
    "created_date": "2024-03-15",
    "technique": "Generative Art",
    "style": "Abstract Expressionism",
    "color_palette": "Ethereal Blues"
  },
  "edition": {
    "number": 15,
    "max": 25
  },
  "traits": [
    {
      "name": "Artist",
      "value": "Alex Rivers"
    },
    {
      "name": "Style",
      "value": "Abstract"
    },
    {
      "name": "Rarity",
      "value": "Rare"
    }
  ]
}
```

---

## 7. Tezos TZIP-21 Metadata

### Overview
Tezos Improvement Proposal 21 defines the metadata standard for FA2 tokens (Tezos NFT standard).

### Required Fields
- `name` - Token name
- `description` - Token description
- `artifactUri` - Main asset URI (replaces "image")

### Optional Fields
- `displayUri` - Display-optimized version
- `thumbnailUri` - Thumbnail version
- `attributes` - Array of attributes
- `formats` - Array of format objects
- `tags` - Array of tags
- `creators` - Array of creator addresses
- `rights` - Copyright/license info
- `decimals` - Decimal places

### JSON Schema

```json
{
  "name": "string",
  "description": "string",
  "artifactUri": "string (URL)",
  "displayUri": "string (URL)",
  "thumbnailUri": "string (URL)",
  "decimals": 0,
  "symbol": "string",
  "attributes": [
    {
      "name": "string",
      "value": "string | number"
    }
  ],
  "formats": [
    {
      "uri": "string (URL)",
      "mimeType": "string",
      "dimensions": {
        "value": "string",
        "unit": "px"
      }
    }
  ],
  "creators": ["string (tz address)"],
  "tags": ["string"],
  "rights": "string",
  "date": "string (ISO 8601)"
}
```

### Example: Tezos Art NFT

```json
{
  "name": "Abstract Composition #7",
  "description": "A vibrant exploration of color and form in the digital realm",
  "artifactUri": "ipfs://QmHash/composition-7-4k.png",
  "displayUri": "ipfs://QmHash/composition-7-display.png",
  "thumbnailUri": "ipfs://QmHash/composition-7-thumb.png",
  "symbol": "COMP7",
  "decimals": 0,
  "attributes": [
    {
      "name": "Artist",
      "value": "Sofia Martinez"
    },
    {
      "name": "Style",
      "value": "Abstract"
    },
    {
      "name": "Medium",
      "value": "Digital"
    },
    {
      "name": "Edition",
      "value": "1/1"
    }
  ],
  "formats": [
    {
      "uri": "ipfs://QmHash/composition-7-4k.png",
      "mimeType": "image/png",
      "dimensions": {
        "value": "4096x4096",
        "unit": "px"
      }
    },
    {
      "uri": "ipfs://QmHash/composition-7-hd.png",
      "mimeType": "image/png",
      "dimensions": {
        "value": "1920x1920",
        "unit": "px"
      }
    }
  ],
  "creators": ["tz1VSUr8wwNhLAzempoch5d6hLRiTh8Cjcjb"],
  "tags": ["abstract", "colorful", "digital-art", "generative"],
  "rights": "CC BY-NC 4.0",
  "date": "2024-02-20T14:30:00Z"
}
```

### Example: Tezos Music NFT

```json
{
  "name": "Midnight Jazz Session",
  "description": "An improvisational jazz piece recorded live at midnight in New Orleans",
  "artifactUri": "ipfs://QmAudioHash/midnight-jazz.mp3",
  "displayUri": "ipfs://QmImageHash/album-cover.jpg",
  "thumbnailUri": "ipfs://QmImageHash/album-cover-thumb.jpg",
  "symbol": "JAZZ01",
  "decimals": 0,
  "attributes": [
    {
      "name": "Artist",
      "value": "The Night Owls"
    },
    {
      "name": "Genre",
      "value": "Jazz"
    },
    {
      "name": "Duration",
      "value": "5:47"
    },
    {
      "name": "BPM",
      "value": 92
    },
    {
      "name": "Key",
      "value": "E♭ Minor"
    }
  ],
  "formats": [
    {
      "uri": "ipfs://QmAudioHash/midnight-jazz.mp3",
      "mimeType": "audio/mpeg",
      "fileSize": 8472941
    },
    {
      "uri": "ipfs://QmAudioHash/midnight-jazz.flac",
      "mimeType": "audio/flac",
      "fileSize": 45289103
    }
  ],
  "creators": ["tz1MusicCreator111111111111111111111111"],
  "tags": ["jazz", "live-recording", "instrumental", "new-orleans"],
  "rights": "All rights reserved",
  "date": "2024-01-15T00:00:00Z"
}
```

---

## 8. Comparison Table

| Feature | Enjin | ERC-721 | ERC-1155 | Metaplex | Flow | TZIP-21 |
|---------|-------|---------|----------|----------|------|---------|
| **Blockchain** | Enjin | Ethereum | Ethereum | Solana | Flow | Tezos |
| **Name field** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Description** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Image/Media** | `media` (array) | `image` | `image` | `image` | `thumbnail` | `artifactUri` |
| **Multiple Media** | ✅ (scrollable) | ❌ | ❌ | ✅ | ❌ | ✅ |
| **Fallback Image** | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ (displayUri) |
| **Banner Image** | ✅ (collection) | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Attributes** | `attributes` (object) | `attributes` (array) | `attributes` (array) | `attributes` (array) | `traits` (array) | `attributes` (array) |
| **External URL** | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| **Animation** | ✅ (via media) | ✅ (animation_url) | ❌ | ✅ | ❌ | ✅ (formats) |
| **3D Models** | ✅ (GLB in media) | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Keywords/Tags** | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ (tags) |
| **Decimals** | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ |
| **Localization** | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Royalties** | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Creators** | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| **Collection Meta** | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Use Case** | Gaming/Multiverse | General NFT | Multi-token | General NFT | Sports/Art | Art/Music |

---

## 9. Validation Rules

### Common Validation Rules

#### URL Validation
```javascript
// Valid protocols
const validProtocols = ['https:', 'ipfs:', 'ar:'];

// Invalid protocols (security risk)
const invalidProtocols = ['http:', 'file:', 'javascript:', 'data:'];

// IPFS URL formats
const ipfsFormats = [
  'ipfs://QmHash...',
  'https://ipfs.io/ipfs/QmHash...',
  'https://gateway.pinata.cloud/ipfs/QmHash...',
  'https://cloudflare-ipfs.com/ipfs/QmHash...'
];

// Arweave URL formats
const arweaveFormats = [
  'ar://TransactionHash',
  'https://arweave.net/TransactionHash'
];
```

#### Required Fields by Standard

**Enjin Token:**
```javascript
const requiredFields = ['name', 'description'];
const optionalFields = ['media', 'fallback_image', 'attributes', 'external_url', 'keywords'];

// Media array structure
const mediaStructure = {
  url: 'string (required)',
  type: 'string (MIME type, required)'
};

// Attributes object structure (nested, not array)
const attributesStructure = {
  'Attribute Name': {
    value: 'string | number'
  }
};
```

**Enjin Collection:**
```javascript
const requiredFields = ['name', 'description'];
const optionalFields = ['media', 'banner_image', 'fallback_image', 'external_url'];
```

**ERC-721:**
```javascript
const requiredFields = ['name', 'description', 'image'];
const optionalFields = ['external_url', 'attributes', 'background_color', 'animation_url', 'youtube_url'];
```

**ERC-1155:**
```javascript
const requiredFields = ['name', 'description', 'image'];
const optionalFields = ['decimals', 'properties', 'attributes', 'localization'];
```

**Metaplex (Solana):**
```javascript
const requiredFields = ['name', 'symbol', 'description', 'image'];
const optionalFields = ['animation_url', 'external_url', 'attributes', 'properties', 'collection'];
```

**Flow:**
```javascript
const requiredFields = ['name', 'description', 'thumbnail'];
const optionalFields = ['metadata', 'edition', 'traits'];
```

**TZIP-21 (Tezos):**
```javascript
const requiredFields = ['name', 'description', 'artifactUri'];
const optionalFields = ['displayUri', 'thumbnailUri', 'attributes', 'formats', 'creators', 'tags', 'rights'];
```

### Attribute Validation

#### Enjin Attributes (Object Structure)
```javascript
// Enjin uses nested object, NOT array
const validEnjinAttributes = {
  "Attack Power": {
    value: 150
  },
  "Rarity": {
    value: "Legendary"
  },
  "Usable In": {
    value: "Game A, Game B, Game C"
  }
};

// Invalid - this is NOT the Enjin format
const invalidEnjinAttributes = [
  { trait_type: "Attack Power", value: 150 }  // Wrong - this is ERC-721 format
];
```

#### ERC-721/OpenSea Attributes (Array Structure)
```javascript
// Valid display types
const validDisplayTypes = [
  null,               // Default (no special display)
  'number',          // Numeric value
  'boost_percentage', // Percentage boost
  'boost_number',    // Numeric boost
  'date'             // Unix timestamp (seconds)
];

// Attribute structure
const validAttribute = {
  trait_type: 'string',              // Required
  value: 'string | number',          // Required
  display_type: 'string | null',     // Optional
  max_value: 'number | undefined'    // Optional (for ranking)
};
```

### Media Validation

#### Enjin Media Array
```javascript
// Valid media structure
const validMedia = [
  {
    url: 'https://cdn.enjin.io/image.jpg',
    type: 'image/jpg'
  },
  {
    url: 'https://cdn.enjin.io/video.mp4',
    type: 'video/mp4'
  },
  {
    url: 'https://cdn.enjin.io/model.glb',
    type: 'model/gltf-binary'
  }
];

// Supported MIME types
const supportedMimeTypes = [
  // Images
  'image/jpg',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  // Videos
  'video/mp4',
  'video/webm',
  // 3D Models
  'model/gltf-binary'
];
```

#### Example Validation Function

```javascript
/**
 * Validates NFT metadata against a specific standard
 * @param {Object} metadata - The metadata object to validate
 * @param {string} standard - The standard to validate against
 * @returns {{valid: boolean, errors: string[]}}
 */
function validateMetadata(metadata, standard) {
  const errors = [];
  
  // Standard-specific required fields
  const requiredFields = {
    'enjin': ['name', 'description'],
    'enjin-collection': ['name', 'description'],
    'erc721': ['name', 'description', 'image'],
    'erc1155': ['name', 'description', 'image'],
    'metaplex': ['name', 'symbol', 'description', 'image'],
    'flow': ['name', 'description', 'thumbnail'],
    'tzip21': ['name', 'description', 'artifactUri']
  };
  
  const required = requiredFields[standard.toLowerCase()];
  
  if (!required) {
    errors.push(`Unknown standard: ${standard}`);
    return { valid: false, errors };
  }
  
  // Check required fields
  for (const field of required) {
    if (!metadata[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }
  
  // Validate Enjin-specific structure
  if (standard.toLowerCase().startsWith('enjin')) {
    // Validate media array
    if (metadata.media) {
      if (!Array.isArray(metadata.media)) {
        errors.push('media must be an array');
      } else {
        metadata.media.forEach((item, index) => {
          if (!item.url) {
            errors.push(`media[${index}] missing url`);
          }
          if (!item.type) {
            errors.push(`media[${index}] missing type (MIME type)`);
          }
        });
      }
    }
    
    // Validate attributes (object structure, not array)
    if (metadata.attributes) {
      if (Array.isArray(metadata.attributes)) {
        errors.push('Enjin attributes must be an object, not an array');
      } else if (typeof metadata.attributes !== 'object') {
        errors.push('attributes must be an object');
      } else {
        // Validate each attribute has a value property
        for (const [key, attr] of Object.entries(metadata.attributes)) {
          if (!attr.value && attr.value !== 0) {
            errors.push(`Attribute "${key}" missing value property`);
          }
        }
      }
    }
    
    // Validate keywords array
    if (metadata.keywords && !Array.isArray(metadata.keywords)) {
      errors.push('keywords must be an array of strings');
    }
  }
  
  // Validate URL fields
  const urlFields = {
    'enjin': ['external_url', 'banner_image', 'fallback_image'],
    'erc721': ['image', 'external_url', 'animation_url'],
    'erc1155': ['image'],
    'metaplex': ['image', 'animation_url', 'external_url'],
    'flow': ['thumbnail'],
    'tzip21': ['artifactUri', 'displayUri', 'thumbnailUri']
  };
  
  const fieldsToCheck = urlFields[standard.toLowerCase()] || [];
  
  for (const field of fieldsToCheck) {
    if (metadata[field]) {
      const url = metadata[field];
      
      // Check for dangerous protocols
      if (url.startsWith('javascript:') || url.startsWith('data:') || url.startsWith('file:')) {
        errors.push(`Dangerous protocol in ${field}: ${url}`);
      }
      
      // Warn about HTTP (not HTTPS)
      if (url.startsWith('http://')) {
        errors.push(`Insecure protocol (HTTP) in ${field}. Use HTTPS instead.`);
      }
    }
  }
  
  // Validate ERC-721 attributes array
  if (standard.toLowerCase() === 'erc721' && metadata.attributes && Array.isArray(metadata.attributes)) {
    metadata.attributes.forEach((attr, index) => {
      if (!attr.trait_type) {
        errors.push(`Attribute ${index} missing trait_type`);
      }
      if (attr.value === undefined) {
        errors.push(`Attribute ${index} missing value`);
      }
      
      // Validate display_type if present
      if (attr.display_type) {
        const validTypes = [null, 'number', 'boost_percentage', 'boost_number', 'date'];
        if (!validTypes.includes(attr.display_type)) {
          errors.push(`Attribute ${index} has invalid display_type: ${attr.display_type}`);
        }
      }
    });
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
```

### Example Usage

```javascript
// Validate Enjin token metadata
const enjinMetadata = {
  name: "Legendary Sword",
  description: "A powerful weapon",
  media: [
    {
      url: "https://cdn.enjin.io/sword.jpg",
      type: "image/jpg"
    }
  ],
  attributes: {
    "Attack Power": {
      value: 150
    },
    "Rarity": {
      value: "Legendary"
    }
  }
};

const result = validateMetadata(enjinMetadata, 'enjin');
console.log(result);
// { valid: true, errors: [] }

// Invalid Enjin metadata example (using array for attributes)
const invalidEnjinMetadata = {
  name: "Broken Sword",
  description: "This metadata is wrong",
  media: [
    {
      url: "https://cdn.enjin.io/broken.jpg",
      type: "image/jpg"
    }
  ],
  attributes: [
    { trait_type: "Attack", value: 50 }  // Wrong - array format
  ]
};

const invalidResult = validateMetadata(invalidEnjinMetadata, 'enjin');
console.log(invalidResult);
// { 
//   valid: false, 
//   errors: ['Enjin attributes must be an object, not an array']
// }

// Validate ERC-721 metadata
const erc721Metadata = {
  name: "Cool NFT",
  description: "A cool NFT",
  image: "https://example.com/nft.png",
  attributes: [
    {
      trait_type: "Rarity",
      value: "Rare"
    }
  ]
};

const erc721Result = validateMetadata(erc721Metadata, 'erc721');
console.log(erc721Result);
// { valid: true, errors: [] }
```

---

## Additional Resources

### Official Documentation
- **Enjin:** https://docs.enjin.io/
- **ERC-721:** https://eips.ethereum.org/EIPS/eip-721
- **ERC-1155:** https://eips.ethereum.org/EIPS/eip-1155
- **OpenSea Metadata:** https://docs.opensea.io/docs/metadata-standards
- **Metaplex:** https://docs.metaplex.com/programs/token-metadata/
- **Flow NFT:** https://developers.flow.com/build/core-contracts/nft-standard
- **TZIP-21:** https://tzip.tezosagora.org/proposal/tzip-21/

### Tools & Libraries
- **NFT Metadata Validator:** https://github.com/ProjectOpenSea/metadata-standard
- **IPFS:** https://ipfs.io/
- **Arweave:** https://arweave.org/
- **Pinata (IPFS Gateway):** https://pinata.cloud/

---

**Last Updated:** February 12, 2026  
**Version:** 1.0
