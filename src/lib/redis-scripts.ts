/**
 * Lua scripts for atomic Redis operations.
 * Each script runs as a single atomic operation on Redis.
 */

/**
 * addVote — atomic check-and-insert
 *
 * Keys: poll:{id} (hash), poll:{id}:voters (set), poll:{id}:votes (list), poll:{id}:results (string)
 * Args: voterId, voteJSON, maxVotes
 *
 * Returns: [status, message]
 *   [0, "closed"]         — poll is closed
 *   [0, "capacity"]       — max votes reached
 *   [0, "duplicate_vote"] — voter already voted
 *   [0, "not_found"]      — poll doesn't exist
 *   [1, "ok"]             — vote added
 */
export const ADD_VOTE_SCRIPT = `
local exists = redis.call('EXISTS', KEYS[1])
if exists == 0 then return {0, 'not_found'} end
local isClosed = redis.call('HGET', KEYS[1], 'isClosed')
if isClosed == 'true' then return {0, 'closed'} end
local voteCount = redis.call('LLEN', KEYS[3])
if tonumber(voteCount) >= tonumber(ARGV[3]) then return {0, 'capacity'} end
local added = redis.call('SADD', KEYS[2], ARGV[1])
if added == 0 then return {0, 'duplicate_vote'} end
redis.call('RPUSH', KEYS[3], ARGV[2])
redis.call('DEL', KEYS[4])
return {1, 'ok'}
`;

/**
 * closePoll — atomic ownership check + state mutation
 *
 * Keys: poll:{id} (hash)
 * Args: userId, closedAt (timestamp)
 *
 * Returns: [status, message]
 *   [0, "not_found"]      — poll doesn't exist
 *   [0, "forbidden"]      — not the owner
 *   [0, "already_closed"] — poll already closed
 *   [1, "ok"]             — poll closed
 */
export const CLOSE_POLL_SCRIPT = `
local ownerId = redis.call('HGET', KEYS[1], 'ownerId')
if not ownerId then return {0, 'not_found'} end
if ownerId ~= ARGV[1] then return {0, 'forbidden'} end
local isClosed = redis.call('HGET', KEYS[1], 'isClosed')
if isClosed == 'true' then return {0, 'already_closed'} end
redis.call('HSET', KEYS[1], 'isClosed', 'true', 'closedAt', ARGV[2])
return {1, 'ok'}
`;
