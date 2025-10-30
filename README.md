# ambassador
A toy implementation of the ambassador pattern

## Usage

### Create a .env in recipe-service

```
# Redis connection string
REDIS_URL=recipe-redis://localhost:6379

# Port your Express server will run on
PORT=3000
```

### Start redis

`docker run --name recipe-redis -p 6379:6379 -d redis`

Or with persistent storage

`docker run --name recipe-redis -p 6379:6379 -d redis redis-server --save 60 1 --loglevel warning`
