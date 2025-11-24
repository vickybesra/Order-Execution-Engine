/**
 * Unit Tests for MockDexRouter
 * 
 * Tests the routing logic to ensure it correctly selects the better-priced quote.
 */

import { MockDexRouter } from '../mock-dex-router.service';
import { DexQuote } from '../../types/order';

describe('MockDexRouter', () => {
  let router: MockDexRouter;

  beforeEach(() => {
    router = new MockDexRouter();
    // Suppress console.log during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getRaydiumQuote', () => {
    it('should return a valid Raydium quote', async () => {
      const quote = await router.getRaydiumQuote('SOL', 'USDC', 10);

      expect(quote).toBeDefined();
      expect(quote.dex).toBe('RAYDIUM');
      expect(quote.price).toBeGreaterThan(0);
      expect(quote.fee).toBeGreaterThan(0);
      expect(quote.netPrice).toBeGreaterThan(0);
      expect(quote.amountOut).toBeGreaterThan(0);
      expect(quote.liquidity).toBeGreaterThan(0);
    });

    it('should include fee in the quote', async () => {
      const quote = await router.getRaydiumQuote('SOL', 'USDC', 10);

      // Fee should be a percentage of the amount (0.25% - 0.3%)
      expect(quote.fee).toBeGreaterThan(0.002 * 10);
      expect(quote.fee).toBeLessThan(0.004 * 10);
    });

    it('should calculate net price correctly', async () => {
      const quote = await router.getRaydiumQuote('SOL', 'USDC', 10);

      // Net price represents effective exchange rate (amountOut / amountIn)
      // Should be a positive value representing the exchange rate
      expect(quote.netPrice).toBeGreaterThan(0);
      expect(quote.netPrice).toBeLessThan(200); // Reasonable upper bound
    });
  });

  describe('getMeteoraQuote', () => {
    it('should return a valid Meteora quote', async () => {
      const quote = await router.getMeteoraQuote('SOL', 'USDC', 10);

      expect(quote).toBeDefined();
      expect(quote.dex).toBe('METEORA');
      expect(quote.price).toBeGreaterThan(0);
      expect(quote.fee).toBeGreaterThan(0);
      expect(quote.netPrice).toBeGreaterThan(0);
      expect(quote.amountOut).toBeGreaterThan(0);
      expect(quote.liquidity).toBeGreaterThan(0);
    });

    it('should include fee in the quote', async () => {
      const quote = await router.getMeteoraQuote('SOL', 'USDC', 10);

      // Fee should be a percentage of the amount (0.3% - 0.5%)
      expect(quote.fee).toBeGreaterThan(0.002 * 10);
      expect(quote.fee).toBeLessThan(0.006 * 10);
    });
  });

  describe('getBestQuote', () => {
    it('should fetch quotes from both DEXs concurrently', async () => {
      const startTime = Date.now();
      const result = await router.getBestQuote('SOL', 'USDC', 10);
      const endTime = Date.now();

      // Should have both quotes
      expect(result.raydiumQuote).toBeDefined();
      expect(result.meteoraQuote).toBeDefined();
      expect(result.bestQuote).toBeDefined();

      // Should complete in approximately 200ms (concurrent execution)
      // Allow some margin for test execution time
      expect(endTime - startTime).toBeLessThan(500);
    });

    it('should select Raydium when it has better net price', async () => {
      // Mock the quote methods to return predictable values
      jest.spyOn(router, 'getRaydiumQuote').mockResolvedValue({
        dex: 'RAYDIUM',
        price: 0.01,
        fee: 0.0025,
        netPrice: 0.00975, // Better net price
        amountOut: 997.5,
        liquidity: 1000000,
      });

      jest.spyOn(router, 'getMeteoraQuote').mockResolvedValue({
        dex: 'METEORA',
        price: 0.01,
        fee: 0.004,
        netPrice: 0.0096, // Worse net price
        amountOut: 996,
        liquidity: 500000,
      });

      const result = await router.getBestQuote('SOL', 'USDC', 10);

      expect(result.bestQuote.dex).toBe('RAYDIUM');
      expect(result.bestQuote.netPrice).toBe(0.00975);
    });

    it('should select Meteora when it has better net price', async () => {
      jest.spyOn(router, 'getRaydiumQuote').mockResolvedValue({
        dex: 'RAYDIUM',
        price: 0.01,
        fee: 0.004,
        netPrice: 0.0096, // Worse net price
        amountOut: 996,
        liquidity: 1000000,
      });

      jest.spyOn(router, 'getMeteoraQuote').mockResolvedValue({
        dex: 'METEORA',
        price: 0.01,
        fee: 0.0025,
        netPrice: 0.00975, // Better net price
        amountOut: 997.5,
        liquidity: 500000,
      });

      const result = await router.getBestQuote('SOL', 'USDC', 10);

      expect(result.bestQuote.dex).toBe('METEORA');
      expect(result.bestQuote.netPrice).toBe(0.00975);
    });

    it('should select based on liquidity when net prices are equal', async () => {
      jest.spyOn(router, 'getRaydiumQuote').mockResolvedValue({
        dex: 'RAYDIUM',
        price: 0.01,
        fee: 0.003,
        netPrice: 0.0097, // Same net price
        amountOut: 997,
        liquidity: 2000000, // Higher liquidity
      });

      jest.spyOn(router, 'getMeteoraQuote').mockResolvedValue({
        dex: 'METEORA',
        price: 0.01,
        fee: 0.003,
        netPrice: 0.0097, // Same net price
        amountOut: 997,
        liquidity: 1000000, // Lower liquidity
      });

      const result = await router.getBestQuote('SOL', 'USDC', 10);

      expect(result.bestQuote.dex).toBe('RAYDIUM');
      expect(result.bestQuote.liquidity).toBeGreaterThan(result.meteoraQuote.liquidity!);
    });

    it('should always return a valid best quote', async () => {
      const result = await router.getBestQuote('SOL', 'USDC', 10);

      expect(result.bestQuote).toBeDefined();
      expect(['RAYDIUM', 'METEORA']).toContain(result.bestQuote.dex);
      expect(result.bestQuote.netPrice).toBeGreaterThan(0);
      expect(result.bestQuote.amountOut).toBeGreaterThan(0);
    });

    it('should handle different token pairs', async () => {
      const result1 = await router.getBestQuote('SOL', 'USDC', 10);
      const result2 = await router.getBestQuote('ETH', 'BTC', 5);

      expect(result1.bestQuote).toBeDefined();
      expect(result2.bestQuote).toBeDefined();
      expect(result1.raydiumQuote).toBeDefined();
      expect(result2.raydiumQuote).toBeDefined();
    });
  });

  describe('executeSwap', () => {
    it('should execute a swap and return a transaction hash', async () => {
      const order = {
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amount: 10,
        orderType: 'MARKET' as const,
      };

      const startTime = Date.now();
      const result = await router.executeSwap('RAYDIUM', order);
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(result.txHash).toBeDefined();
      expect(result.txHash.length).toBe(64); // Standard transaction hash length
      expect(result.dex).toBe('RAYDIUM');
      expect(result.executedPrice).toBeGreaterThan(0);
      expect(result.executedAmount).toBeGreaterThan(0);
      expect(result.executionTimestamp).toBeGreaterThan(0);

      // Should take approximately 2-3 seconds
      expect(endTime - startTime).toBeGreaterThan(1900);
      expect(endTime - startTime).toBeLessThan(3500);
    });

    it('should generate unique transaction hashes', async () => {
      const order = {
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amount: 10,
        orderType: 'MARKET' as const,
      };

      const result1 = await router.executeSwap('RAYDIUM', order);
      const result2 = await router.executeSwap('METEORA', order);

      expect(result1.txHash).not.toBe(result2.txHash);
    }, 10000); // Increase timeout to 10 seconds for this test

    it('should handle different DEXs', async () => {
      const order = {
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amount: 10,
        orderType: 'MARKET' as const,
      };

      const raydiumResult = await router.executeSwap('RAYDIUM', order);
      const meteoraResult = await router.executeSwap('METEORA', order);

      expect(raydiumResult.dex).toBe('RAYDIUM');
      expect(meteoraResult.dex).toBe('METEORA');
      expect(raydiumResult.success).toBe(true);
      expect(meteoraResult.success).toBe(true);
    }, 10000); // Increase timeout to 10 seconds for this test
  });

  describe('Price Comparison Logic', () => {
    it('should correctly identify better net price', async () => {
      // Create mock quotes with known values
      const raydiumQuote: DexQuote = {
        dex: 'RAYDIUM',
        price: 0.01,
        fee: 0.002,
        netPrice: 0.0098,
        amountOut: 998,
        liquidity: 1000000,
      };

      const meteoraQuote: DexQuote = {
        dex: 'METEORA',
        price: 0.01,
        fee: 0.003,
        netPrice: 0.0097,
        amountOut: 997,
        liquidity: 500000,
      };

      jest.spyOn(router, 'getRaydiumQuote').mockResolvedValue(raydiumQuote);
      jest.spyOn(router, 'getMeteoraQuote').mockResolvedValue(meteoraQuote);

      const result = await router.getBestQuote('SOL', 'USDC', 10);

      // Raydium has better net price (higher is better - more tokenOut per tokenIn)
      // 0.0098 > 0.0097, so Raydium should be selected
      expect(result.bestQuote.dex).toBe('RAYDIUM');
      expect(result.bestQuote.netPrice).toBe(0.0098);
    });

    it('should handle edge case where one DEX has significantly better price', async () => {
      const raydiumQuote: DexQuote = {
        dex: 'RAYDIUM',
        price: 0.01,
        fee: 0.001,
        netPrice: 0.0099, // Much better
        amountOut: 999,
        liquidity: 1000000,
      };

      const meteoraQuote: DexQuote = {
        dex: 'METEORA',
        price: 0.01,
        fee: 0.005,
        netPrice: 0.0095, // Much worse
        amountOut: 995,
        liquidity: 500000,
      };

      jest.spyOn(router, 'getRaydiumQuote').mockResolvedValue(raydiumQuote);
      jest.spyOn(router, 'getMeteoraQuote').mockResolvedValue(meteoraQuote);

      const result = await router.getBestQuote('SOL', 'USDC', 10);

      expect(result.bestQuote.dex).toBe('RAYDIUM');
    });
  });
});

