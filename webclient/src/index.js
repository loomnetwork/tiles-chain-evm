import 'pixi'
import 'p2'
import * as Phaser from 'phaser'
import ContractClient from './contract_client'
import { CryptoUtils } from './loom.umd'

const colors = [
  {r: 255, g: 0  , b: 0  },
  {r: 255, g: 0  , b: 255},
  {r: 255, g: 255, b: 0  },
  {r: 0  , g: 255, b: 0  },
  {r:   0, g: 255, b: 255},
  {r:   0, g: 0  , b: 255}
]

class SimpleGame {
  constructor() {
    this.game = new Phaser.Game(640, 480, Phaser.AUTO, "content", this)
    this.contractClient = new ContractClient()
  }

  async create() {
    await this.contractClient.createContract()

    // get an random color for the user
    this.userColor = colors[this.game.rnd.integerInRange(0, 5)]

    // initialize map
    this.tileMap = {tiles: []}

    // listen for mouse event
    this.game.input.mouse.onMouseDown = mouseEv => this.onMouseDown(mouseEv)

    // subscribe for tile map updates from websocket
    this.contractClient.onEvent = tileData => {
      if (tileData.returnValues.state) {
        this.drawTiles(tileData.returnValues.state)
      }
    }

    // request state update
    this.requestUpdateTilesOnCanvas()
  }

  async onMouseDown(mouseEv) {
    try {
      await this.setTileMap(mouseEv.x, mouseEv.y)
      this.drawTile(mouseEv.x , mouseEv.y, this.userColor.r, this.userColor.g, this.userColor.b)
    } catch (err) {
      console.error('something wrong', err)
    }
  }

  // draw tiles from JSON
  drawTiles(tileData) {
    this.tileMap = JSON.parse(tileData)
    this.tileMap.tiles.forEach(tile => {
      this.drawTile(tile.point.x, tile.point.y, tile.color.r, tile.color.g, tile.color.b)
    })
  }

  // Draw a single tile
  drawTile(x, y, r, g, b) {
    const bmp = this.game.add.bitmapData(10, 10)
    bmp.fill(r, g, b)
    const box = this.game.add.sprite(x, y, bmp)
    box.anchor.set(1.5, 1.5)
  }

  // Used when request an update without web sockets
  async requestUpdateTilesOnCanvas() {
    const tileMapState = await this.contractClient.getTileMapState()
    if (tileMapState) {
      this.drawTiles(tileMapState)
    }
  }

  // push new tile to tile map state
  async setTileMap(x, y) {
    this.tileMap.tiles.push({
      point: {
        x,
        y
      },
      color: {
        r: this.userColor.r,
        g: this.userColor.g,
        b: this.userColor.b
      }
    })

    // send the transaction
    await this.contractClient.setTileMapState(JSON.stringify(this.tileMap))
  }
}

window.onload = () => {
  const game = new SimpleGame()
}
