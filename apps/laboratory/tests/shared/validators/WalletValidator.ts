import { expect } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

export class WalletValidator {
  private readonly gotoSessions: Locator

  constructor(public readonly page: Page) {
    this.gotoSessions = this.page.getByTestId('sessions')
  }

  async expectConnected() {
    await this.page.reload()
    await this.gotoSessions.click()
    await expect(this.page.getByTestId('session-card')).toBeVisible()
  }

  async expectDisconnected() {
    // There is an issue in ethers where the `.disconnect` might not be done
    await this.page.waitForTimeout(2000)
    await this.page.reload()
    await this.gotoSessions.click()
    await expect(this.page.getByTestId('session-card')).not.toBeVisible()
  }

  async expectReceivedSign({ chainName = 'Ethereum' }) {
    await expect(this.page.getByTestId('session-approve-button')).toBeVisible()
    await expect(this.page.getByTestId('request-details-chain')).toHaveText(chainName)
  }
}
