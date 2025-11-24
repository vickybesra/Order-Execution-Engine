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
export declare class MockDexRouter {
    /**
     * Simulate network delay
     */
    private delay;
    /**
     * Generate a random number between min and max (inclusive)
     */
    private randomBetween;
    /**
     * Simulate fetching a quote from Raydium DEX
     *
     * @param tokenIn - Token being sold
     * @param tokenOut - Token being bought
     * @param amount - Amount of tokenIn to sell
     * @returns Promise<DexQuote> - Quote from Raydium
     */
    getRaydiumQuote(tokenIn: string, tokenOut: string, amount: number): Promise<DexQuote>;
    /**
     * Simulate fetching a quote from Meteora DEX
     *
     * @param tokenIn - Token being sold
     * @param tokenOut - Token being bought
     * @param amount - Amount of tokenIn to sell
     * @returns Promise<DexQuote> - Quote from Meteora
     */
    getMeteoraQuote(tokenIn: string, tokenOut: string, amount: number): Promise<DexQuote>;
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
    getBestQuote(tokenIn: string, tokenOut: string, amount: number): Promise<{
        bestQuote: DexQuote;
        raydiumQuote: DexQuote;
        meteoraQuote: DexQuote;
    }>;
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
    executeSwap(dex: DexName, order: OrderRequest): Promise<SwapExecutionResult>;
    /**
     * Generate a mock transaction hash
     */
    private generateMockTxHash;
}
export declare const mockDexRouter: MockDexRouter;
//# sourceMappingURL=mock-dex-router.service.d.ts.map