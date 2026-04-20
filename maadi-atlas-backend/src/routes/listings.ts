import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { AnchorKey, Feature, Listing } from '../types.ts';
import {
  distinctSources,
  latestUpdatedAt,
  queryListings,
} from '../db/listings.ts';

const ALL_FEATURES: Feature[] = ['garden', 'rooftop', 'ground'];
const SORT_KEYS = new Set<string>([
  'school216',
  'fablab',
  'maadiClub',
  'wadiDegla',
  'garden',
  'traffic',
  'price',
]);

type Query = {
  listing?: string;
  features?: string;
  sort?: string;
};

export async function registerListingsRoute(app: FastifyInstance): Promise<void> {
  app.get('/api/listings', async (req: FastifyRequest<{ Querystring: Query }>) => {
    const { listing, features, sort } = req.query;

    const listingParam: Listing | 'all' | undefined =
      listing === 'rent' || listing === 'sale' || listing === 'all'
        ? listing
        : undefined;

    const featureList = (features ?? '')
      .split(',')
      .map((f) => f.trim())
      .filter((f): f is Feature => ALL_FEATURES.includes(f as Feature));

    const sortParam =
      sort && SORT_KEYS.has(sort)
        ? (sort as AnchorKey | 'traffic' | 'price')
        : undefined;

    const listings = queryListings({
      listing: listingParam,
      features: featureList.length ? featureList : undefined,
      sort: sortParam,
    });

    return {
      listings,
      updatedAt: latestUpdatedAt(),
      sources: distinctSources(),
    };
  });
}
