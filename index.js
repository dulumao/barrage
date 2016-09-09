
    //弹幕
   var Barrage = {
     Socket   :io(), //Socket对象
     userMsg  : [],   //用户消息数组
     otherMsg : [],   //其它消息数组
     otherMsg2: [],   //其它消息备份数组(用于循环弹幕)
     rowsY    : [],   //所有（可容纳）弹幕行Y坐标数组
     curRowsY : [],   //当前弹幕行Y坐标数组
     curCount : 0,    //当前弹幕数
     maxCount : 10,    //最大弹幕数
     msgHeight:45,    //一条弹幕消息高度
     userId   :0,     //用户Id
     winWidth :0,     //当前窗口宽
     duration :12000, //一条弹幕运作时间
     //初始化
     init:function(){
        var __self = this;
        this.getOtherMsg(function(){
          __self.setConfig();
          __self.bindEvent();
          __self.arrange();
        });

     },

     //初始化配置数据
     setConfig:function(){

        // 设置弹幕Y坐标数组
        // 注:坐标设置了一个弹幕显示区域,top>100px && top<=window.screen.height-200px
        var     topY  = 0,
            winHeight = (window.screen.height)-200,
            ableCount = Math.round(winHeight/this.msgHeight);

        while(ableCount--){
            topY += this.msgHeight;
            topY>100 && this.rowsY.push(topY);
        }
        //设置USER信息
        this.setUser();

        //设置窗口高度属性
        this.winWidth = $(window).width();
     },

     getOtherMsg:function(callback){
       __self = this;
      $.get("words.txt", function(result){
            //设置其它消息
            __self.otherMsg   = result.split('||');

            __self.otherMsg   = __self.shuffle(__self.otherMsg); //打乱数组数据
            __self.otherMsg2  = __self.otherMsg.slice(0);        //克隆设置备份其它消息
            callback();
          });
     },

     //获取URL参数
     getUrlParam:function(){
          var url  = location.search, //获取url中"?"符后的字串
           request = new Object();
          if (url.indexOf("?") != -1)
          {
              var strs = (url.substr(1)).split("&");
              for(var i = 0; i < strs.length; i ++)
              {
                   var spt       = strs[i].split("=");
                  request[spt[0]]= unescape(spt[1]);
              }
          }
          return request;
     },

     //获取弹幕可用行Y坐标
     getRowY:function(){
       var __self = this;

       //去重(rowsY+curRowsY数组中的值)
       var rowArr = this.rowsY.filter(
                      function(val){
                          return !(__self.curRowsY.indexOf(val)>=0);
                       });
        //随机返回一个弹幕可用行Y坐标
        return rowArr.length
                        ? rowArr[Math.floor(
                              Math.random()*((rowArr.length-1)-1)+1
                            )]
                        : 0;
     },

     //打乱数组
     shuffle:function(arr){

        var m = arr.length,
            t,i;

            while(m){
                //随机选取一个元素
              i=Math.floor(Math.random()*m--);

              //**与当前元素进行交换**
              t     = arr[m];   //t为当前元素
              arr[m]= arr[i];   //将随机选取元素替换当前值
              arr[i]= t;        //相反(同上)
            }
            return arr.slice(0);
     },

     //排列
     arrange:function(){
        var __self   = this,
            //预备发射消息总数
            msgCount = this.userMsg.length+this.otherMsg2.length;

        //加载现有弹幕
        if(msgCount){

          var count = msgCount>1?Math.floor(Math.random()*(3-1)+1):1;
          //开始排列
          while(count--){

              //获取消息(用户消息 优先> 于预备其它消息)
              var msg = this.userMsg.length
                            ? this.userMsg.shift()
                              : this.otherMsg2.shift();
                              __self.curCount++;
              //发射消息到屏幕中
              msg  && (__self.getRowY())>0 &&__self.shootMsg(msg,__self.getRowY(),__self.duration);
          }

        }else{
            //弹幕空时,设置循环弹幕
            this.otherMsg2=this.shuffle(this.otherMsg);
        }
        //循环弹幕
        setTimeout(function(){
          __self.arrange();
        },2500);
     },

     //添加新弹幕消息
     addNew:function(msg){
      this.shootMsg(msg,this.getRowY(),__self.duration);
     },

     //发射消息到屏幕中
     shootMsg:function(msg,rowY,time){
       var __self = this;

       this.curRowsY.push(rowY);
       $(".msg").append("<div>"+msg+"&nbsp;</div>");

       var curMsg = $(".msg").find('div:last-child'),
             left = (curMsg.width())+10;

       curMsg.css({left:__self.winWidth,top:rowY});
       curMsg.animate(
          {left:"-"+left+"px"},
          {
             duration:time,
             speed:'slow',
             easing:'linear',
             done:function(animation,jumpedToEnd){

               var top = $(this)[0].offsetTop,
                 index = __self.curRowsY.indexOf(top);

                 index>=0 && delete __self.curRowsY[index];
                __self.curCount--;
                $(this).remove();
             }
          });

     },

     //收到消息-DOM
     receiveMsg:function(data){

        //收到自己的消息
        if(data.userId && this.userId==data.userId){

          this.addNew('我:'+data.msg);
        }
        //收到别人消息
        else{
          //推送到用户消息队列中
          this.userMsg.push(data.msg);
          //排列
          this.arrange();
        }
     },

     //发送消息
     sendMsg:function(msg){
        return (this.Socket.emit('chat message', {userId:this.getUser(),msg:msg})).connected;
     },

     //获取用户
     getUser:function(){
        if(window.localStorage){
          var userId = window.localStorage.getItem('mooncakeUserId');
            return  userId?userId:this.setUser();
        }
     },

     //设置用户
     setUser:function(){
          var param   =  this.getUrlParam();
          var userId  = param.userId
                            ? param.userId
                            : Math.floor(Math.random()*(100000000-10)+10);
          this.userId = userId;
          window.localStorage.setItem('mooncakeUserId',userId);
          return userId;
     },

     //绑定事件
     bindEvent:function(){
       var __self = this;

       //发送
       $('#msgForm').submit(function(e){
          e.preventDefault();
          var message = $('#message').val();

          message.trim()
             && __self.sendMsg(message)
             && $('#message').val('')
             && $('.barrage').hide()
             && $('#message').blur()
             && MtaH5.clickStat('senddm',{'write':'true'});
       });

       $('.msg').on('touchend',function(e){
          $('#message').is(":focus")
            && $('.barrage').hide()
            && $('#message').blur();
       });

       $("#message").on('focus',function(e){
          $('.barrage').show()
          && MtaH5.clickStat('touchin',{'write':'true'});
       });

       $('.barrage p,.barrage span').on('touchend',function(e){
         $('#message').val($(this).html());
       });
 
       //接收到消息事件
       __self.Socket.on('chat message', function(msg){
         __self.receiveMsg(msg);
       });
     }
   }

   Barrage.init();