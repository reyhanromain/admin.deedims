## Summary

- 

## Promotion Stage

- [ ] Integration: change branch → `dev`
- [ ] Production: the same tested change branch → `main`
- [ ] This branch was created from the current `main` baseline
- [ ] For a PR to `main`, this exact branch head has passed testing in `dev`

## Verification

- [ ] `cd backend && npm run typecheck`
- [ ] `cd backend && npm test`
- [ ] `cd frontend && npm run build`
- [ ] `cd frontend && npm test`

Integration-test evidence:

- Not run yet

## Release Impact

- [ ] Version/changelog update required
- [ ] Database schema or seed change
- [ ] Environment or secret change
- [ ] Docker or deployment change
- [ ] CMS UI change with screenshots attached
