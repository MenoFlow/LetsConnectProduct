import {Body,Controller,Delete,Get,Param,Patch,Post,Req,Query} from '@nestjs/common';
import {AuthRequest,Public} from './security';
import {WorkspaceService} from './workspace.service';
@Controller()
export class WorkspaceController {
 constructor(private readonly service:WorkspaceService){}
 @Public() @Get('public/snapshot') publicSnapshot(){return this.service.snapshot();}
 @Get('workspace') snapshot(@Req() r:AuthRequest){return this.service.snapshot(r.actor);}
 @Get('companies') async companies(@Req() r:AuthRequest){return (await this.service.snapshot(r.actor)).companies;}
 @Get('products') async products(@Req() r:AuthRequest){return (await this.service.snapshot(r.actor)).products;}
 @Get('categories') async categories(@Req() r:AuthRequest){return (await this.service.snapshot(r.actor)).categories;}
 @Get('users') async users(@Req() r:AuthRequest){return (await this.service.snapshot(r.actor)).users;}
 @Get('conversations') async conversations(@Req() r:AuthRequest){return (await this.service.snapshot(r.actor)).conversations;}
 @Get('messages') async messages(@Req() r:AuthRequest){return (await this.service.snapshot(r.actor)).messages;}
 @Get('members') async members(@Req() r:AuthRequest){return (await this.service.snapshot(r.actor)).companyMembers;}
 @Get('favorites') async favorites(@Req() r:AuthRequest){return (await this.service.snapshot(r.actor)).favorites;}
 @Get('activity') async activity(@Req() r:AuthRequest){return (await this.service.snapshot(r.actor)).activity;}
 @Patch('companies/:id') companyUpdate(@Req() r:AuthRequest,@Param('id') id:string,@Body() b:unknown){return this.service.companyUpdate(r.actor,id,b);}
 @Post('companies/:id/review') review(@Req() r:AuthRequest,@Param('id') id:string,@Body() b:unknown){return this.service.review(r.actor,id,b);}
 @Post('companies/:id/resubmit') resubmit(@Req() r:AuthRequest,@Param('id') id:string){return this.service.resubmit(r.actor,id);}
 @Delete('companies/:id') companyDelete(@Req() r:AuthRequest,@Param('id') id:string){return this.service.companyDelete(r.actor,id);}
 @Post('products') productCreate(@Req() r:AuthRequest,@Body() b:unknown){return this.service.productSave(r.actor,b);}
 @Patch('products/:id') productUpdate(@Req() r:AuthRequest,@Param('id') id:string,@Body() b:unknown){return this.service.productSave(r.actor,b,id);}
 @Delete('products/:id') productDelete(@Req() r:AuthRequest,@Param('id') id:string){return this.service.productDelete(r.actor,id);}
 @Post('categories') categoryCreate(@Req() r:AuthRequest,@Body() b:unknown){return this.service.categorySave(r.actor,b);}
 @Patch('categories/:id') categoryUpdate(@Req() r:AuthRequest,@Param('id') id:string,@Body() b:unknown){return this.service.categorySave(r.actor,b,id);}
 @Delete('categories/:id') categoryDelete(@Req() r:AuthRequest,@Param('id') id:string){return this.service.categoryDelete(r.actor,id);}
 @Patch('users/:id') userUpdate(@Req() r:AuthRequest,@Param('id') id:string,@Body() b:unknown){return this.service.userUpdate(r.actor,id,b);}
 @Patch('users/:id/active') userActive(@Req() r:AuthRequest,@Param('id') id:string,@Body() b:unknown){return this.service.userActive(r.actor,id,b);}
 @Delete('users/:id') userDelete(@Req() r:AuthRequest,@Param('id') id:string){return this.service.userDelete(r.actor,id);}
 @Get('companies/:id/member-lookup') memberLookup(@Req() r:AuthRequest,@Param('id') id:string,@Query('email') email:string){return this.service.memberLookup(r.actor,id,email||'');}
 @Post('members') memberCreate(@Req() r:AuthRequest,@Body() b:unknown){return this.service.memberSave(r.actor,b);}
 @Patch('members/:id') memberUpdate(@Req() r:AuthRequest,@Param('id') id:string,@Body() b:unknown){return this.service.memberSave(r.actor,b,id);}
 @Delete('members/:id') memberDelete(@Req() r:AuthRequest,@Param('id') id:string){return this.service.memberDelete(r.actor,id);}
 @Post('favorites/:companyId/toggle') favorite(@Req() r:AuthRequest,@Param('companyId') id:string){return this.service.favorite(r.actor,id);}
 @Post('conversations') conversationCreate(@Req() r:AuthRequest,@Body() b:unknown){return this.service.conversationCreate(r.actor,b);}
 @Patch('conversations/:id') conversationUpdate(@Req() r:AuthRequest,@Param('id') id:string,@Body() b:unknown){return this.service.conversationUpdate(r.actor,id,b);}
 @Delete('conversations/:id') conversationDelete(@Req() r:AuthRequest,@Param('id') id:string){return this.service.conversationDelete(r.actor,id);}
 @Post('conversations/:id/messages') messageCreate(@Req() r:AuthRequest,@Param('id') id:string,@Body() b:unknown){return this.service.messageCreate(r.actor,id,b);}
 @Post('conversations/:id/read') read(@Req() r:AuthRequest,@Param('id') id:string){return this.service.markRead(r.actor,id);}
 @Patch('messages/:id') messageUpdate(@Req() r:AuthRequest,@Param('id') id:string,@Body() b:unknown){return this.service.messageUpdate(r.actor,id,b);}
 @Delete('messages/:id') messageDelete(@Req() r:AuthRequest,@Param('id') id:string){return this.service.messageDelete(r.actor,id);}
 @Get('cart') cart(@Req() r:AuthRequest){return this.service.cartRead(r.actor);}
 @Post('cart/items') cartAdd(@Req() r:AuthRequest,@Body() b:unknown){return this.service.cartAdd(r.actor,b);}
 @Patch('cart/items/:id') cartQuantity(@Req() r:AuthRequest,@Param('id') id:string,@Body() b:unknown){return this.service.cartQuantity(r.actor,id,b);}
 @Delete('cart/items/:id') cartDelete(@Req() r:AuthRequest,@Param('id') id:string){return this.service.cartDelete(r.actor,id);}
 @Delete('cart') cartClear(@Req() r:AuthRequest){return this.service.cartDelete(r.actor);}
}
