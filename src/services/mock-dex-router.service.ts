/**
 * Mock DEX Router Service
 * 
 * Simulates interactions with decentralized exchanges (DEXs):
 * - Raydium
 * - Meteora
 * 
 * Implements quote fetching, price comparison, and swap execution simulation.
 */

import { DexName, DexQuote, SwapExecutionResult, OrderRequest } from '../types/order';

/**
 * MockDexRouter - Handles all simulated DEX interactions
 */
export class MockDexRouter {
  /**
   * Simulate network delay
   */
  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Generate a random number between min and max (inclusive)
   */
  private randomBetween(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  /**
   * Simulate fetching a quote from Raydium DEX
   * 
   * @param tokenIn - Token being sold
   * @param tokenOut - Token being bought
   * @param amount - Amount of tokenIn to sell
   * @returns Promise<DexQuote> - Quote from Raydium
   */
  async getRaydiumQuote(
    tokenIn: string,
    tokenOut: string,
    amount: number
  ): Promise<DexQuote> {
    // Simulate network delay (~200ms)
    await this.delay(200);

    // Simulate base price (e.g., 1 SOL = 100 USDC)
    const basePrice = this.randomBetween(95, 105);
    
    // Calculate fee (typically 0.25% - 0.3% for Raydium)
    const feePercentage = this.randomBetween(0.0025, 0.003);
    const fee = amount * feePercentage;
    
    // Calculate amount out
    const amountOut = (amount - fee) * basePrice;
    
    // Price per unit of tokenOut in tokenIn
    const price = amount / amountOut;
    
    // Net price: effective exchange rate (amountOut per amountIn after fees)
    // Higher net price = better execution (more tokenOut per tokenIn)
    const netPrice = amountOut / amount;
    
    const quote: DexQuote = {
      dex: 'RAYDIUM',
      price,
      fee,
      netPrice,
      amountOut,
      liquidity: this.randomBetween(1000000, 5000000), // Mock liquidity
    };

    console.log(`[MockDexRouter] Raydium quote: ${amount} ${tokenIn} -> ${amountOut.toFixed(4)} ${tokenOut} (fee: ${fee.toFixed(4)}, net price: ${quote.netPrice.toFixed(6)})`);

    return quote;
  }

  /**
   * Simulate fetching a quote from Meteora DEX
   * 
   * @param tokenIn - Token being sold
   * @param tokenOut - Token being bought
   * @param amount - Amount of tokenIn to sell
   * @returns Promise<DexQuote> - Quote from Meteora
   */
  async getMeteoraQuote(
    tokenIn: string,
    tokenOut: string,
    amount: number
  ): Promise<DexQuote> {
    // Simulate network delay (~200ms)
    await this.delay(200);

    // Simulate base price with variation (2-5% difference from Raydium)
    // This creates realistic price differences between DEXs
    const basePrice = this.randomBetween(97, 108);
    
    // Calculate fee (typically 0.3% - 0.5% for Meteora)
    const feePercentage = this.randomBetween(0.003, 0.005);
    const fee = amount * feePercentage;
    
    // Calculate amount out
    const amountOut = (amount - fee) * basePrice;
    
    // Price per unit of tokenOut in tokenIn
    const price = amount / amountOut;
    
    // Net price: effective exchange rate (amountOut per amountIn after fees)
    // Higher net price = better execution (more tokenOut per tokenIn)
    const netPrice = amountOut / amount;
    
    const quote: DexQuote = {
      dex: 'METEORA',
      price,
      fee,
      netPrice,
      amountOut,
      liquidity: this.randomBetween(500000, 3000000), // Mock liquidity (typically lower than Raydium)
    };

    console.log(`[MockDexRouter] Meteora quote: ${amount} ${tokenIn} -> ${amountOut.toFixed(4)} ${tokenOut} (fee: ${fee.toFixed(4)}, net price: ${quote.netPrice.toFixed(6)})`);

    return quote;
  }

  /**
   * Get the best quote by comparing quotes from both DEXs concurrently
   * 
   * This function:
   * 1. Fetches quotes from both DEXs concurrently
   * 2. Compares net prices (price minus fees)
   * 3. Selects the DEX offering the better execution price
   * 4. Logs the routing decision
   * 
   * @param tokenIn - Token being sold
   * @param tokenOut - Token being bought
   * @param amount - Amount of tokenIn to sell
   * @returns Promise<{bestQuote: DexQuote, raydiumQuote: DexQuote, meteoraQuote: DexQuote}>
   */
  async getBestQuote(
    tokenIn: string,
    tokenOut: string,
    amount: number
  ): Promise<{ bestQuote: DexQuote; raydiumQuote: DexQuote; meteoraQuote: DexQuote }> {
    console.log(`[MockDexRouter] Fetching quotes from both DEXs for ${amount} ${tokenIn} -> ${tokenOut}...`);

    // Fetch quotes concurrently
    const [raydiumQuote, meteoraQuote] = await Promise.all([
      this.getRaydiumQuote(tokenIn, tokenOut, amount),
      this.getMeteoraQuote(tokenIn, tokenOut, amount),
    ]);

    // Compare net prices (higher net price = better execution)
    // Net price represents the effective exchange rate (tokenOut per tokenIn after fees)
    const raydiumNetPrice = raydiumQuote.netPrice;
    const meteoraNetPrice = meteoraQuote.netPrice;

    let bestQuote: DexQuote;
    let selectionReason: string;

    if (raydiumNetPrice > meteoraNetPrice) {
      bestQuote = raydiumQuote;
      const priceDiff = ((raydiumNetPrice - meteoraNetPrice) / meteoraNetPrice) * 100;
      selectionReason = `Raydium offers better net price (${priceDiff.toFixed(2)}% better than Meteora)`;
    } else if (meteoraNetPrice > raydiumNetPrice) {
      bestQuote = meteoraQuote;
      const priceDiff = ((meteoraNetPrice - raydiumNetPrice) / raydiumNetPrice) * 100;
      selectionReason = `Meteora offers better net price (${priceDiff.toFixed(2)}% better than Raydium)`;
    } else {
      // If prices are equal, prefer higher liquidity
      if (raydiumQuote.liquidity && meteoraQuote.liquidity) {
        if (raydiumQuote.liquidity >= meteoraQuote.liquidity) {
          bestQuote = raydiumQuote;
          selectionReason = 'Prices equal, Raydium selected for higher liquidity';
        } else {
          bestQuote = meteoraQuote;
          selectionReason = 'Prices equal, Meteora selected for higher liquidity';
        }
      } else {
        // Fallback to Raydium if liquidity not available
        bestQuote = raydiumQuote;
        selectionReason = 'Prices equal, Raydium selected as default';
      }
    }

    console.log(`[MockDexRouter] ✓ Routing Decision: ${bestQuote.dex} selected`);
    console.log(`[MockDexRouter]   Reason: ${selectionReason}`);
    console.log(`[MockDexRouter]   Best Net Price: ${bestQuote.netPrice.toFixed(6)}`);
    console.log(`[MockDexRouter]   Amount Out: ${bestQuote.amountOut.toFixed(4)} ${tokenOut}`);

    return {
      bestQuote,
      raydiumQuote,
      meteoraQuote,
    };
  }

  /**
   * Simulate executing a swap on the selected DEX
   * 
   * This simulates:
   * - Transaction building time
   * - Network confirmation time
   * - Returns mock execution results
   * 
   * @param dex - The DEX to execute the swap on
   * @param order - The order request
   * @returns Promise<SwapExecutionResult> - Execution result with txHash
   */
  async executeSwap(dex: DexName, order: OrderRequest): Promise<SwapExecutionResult> {
    console.log(`[MockDexRouter] Executing swap on ${dex}...`);
    console.log(`[MockDexRouter] Order: ${order.amount} ${order.tokenIn} -> ${order.tokenOut}`);

    // Simulate execution delay (2-3 seconds)
    const executionDelay = this.randomBetween(2000, 3000);
    await this.delay(executionDelay);

    // Generate mock transaction hash
    const txHash = this.generateMockTxHash();

    // Simulate execution price (may differ slightly from quote due to slippage)
    const executionPrice = this.randomBetween(0.0095, 0.0105); // Small variation from quote
    const executedAmount = order.amount * executionPrice;

    const result: SwapExecutionResult = {
      success: true,
      txHash,
      executedPrice: executionPrice,
      executedAmount,
      dex,
      executionTimestamp: Date.now(),
    };

    console.log(`[MockDexRouter] ✓ Swap executed successfully on ${dex}`);
    console.log(`[MockDexRouter]   TX Hash: ${txHash}`);
    console.log(`[MockDexRouter]   Executed Price: ${executionPrice.toFixed(6)}`);
    console.log(`[MockDexRouter]   Executed Amount: ${executedAmount.toFixed(4)} ${order.tokenOut}`);

    return result;
  }

  /**
   * Generate a mock transaction hash
   */
  private generateMockTxHash(): string {
    const chars = '0123456789abcdef';
    let hash = '';
    for (let i = 0; i < 64; i++) {
      hash += chars[Math.floor(Math.random() * chars.length)];
    }
    return hash;
  }
}

// Export singleton instance
export const mockDexRouter = new MockDexRouter();

