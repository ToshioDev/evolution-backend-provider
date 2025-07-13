import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../../modules/user/user.schema';

export const CurrentUser = createParamDecorator(
  (data: keyof User | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    return data ? user?.[data] : user;
  },
);

export const LocationId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.locationId;
  },
);

export const UserData = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    return {
      id: user?._id,
      username: user?.username,
      email: user?.email,
      locationId: user?.locationId,
      userToken: user?.userToken,
      ghlAuth: user?.ghlAuth,
      evolutionInstances: user?.evolutionInstances,
    };
  },
);
