import socketio from "socket.io-client";
import { SyncSocketIO } from "syncsocketio"
//import { SyncSocketIO } from "../../../syncsocketio/src/syncsocketio"
import { ExtURL } from "./ExtURL";
import { RxUtil } from "./RxUtil";
import { from } from "rxjs";
import { map } from "rxjs/operators";
import "bootstrap";
import "bootstrap/scss/bootstrap.scss";

const args = new ExtURL(document.URL);
const host = args.getQueryParameter("host");
let g_socket: SyncSocketIO | undefined;

$(document).ready(()=>{
  $("#hello").on("click", ()=>{
    const ss = socketio(`${host}`);
    g_socket = SyncSocketIO.connect(ss);

    $("#session_id").text(g_socket.SessionId);
    document.title = `client: ${g_socket.SessionId}`;

    $("#server")
      .attr("href", `server.html?session_id=${g_socket.SessionId}&host=${host}`);
  
    g_socket.onUnsolicitedMessageAll((m)=>{
      log(`onUnsolicitedMessageAll(${JSON.stringify(m, null, 1)})`);
    });
  
    g_socket.onSolcitedMessageAll((m)=>{
      log(`onSolcitedMessageAll(${JSON.stringify(m, null, 1)})`);
      doUpdatePendingSolicitedMessages();
    });
  
    $("#hello").prop("disabled", true);
  
    $("#farewell").on("click", ()=>{
      if(g_socket){
        log("farewell");
        g_socket.emitUnsolicitedMessage("farewell")
        .then(()=>{
          if(g_socket){
            g_socket.goodbye();
          }
          g_socket = undefined;
          log("farewell -> success");
        })
        .catch((err)=>{
          log("farewell -> error");
        });
      }
    });
  });

  $("#emit_unsolicited_message").on("click", ()=>{
    if(!g_socket){
      log(`socket == null`);
      return;
    }
    log("emitUnsolicitedMessage");
    g_socket.emitUnsolicitedMessage(
      $("#message_event").val() as string,
      JSON.parse($("#message_body").val() as string)
    )
    .then((x)=>{
      log("emitUnsolicitedMessage -> success");
    })
    .catch((err)=>{
      log("emitUnsolicitedMessage -> error");
    });
  });

  $("#emit_solicited_message").on("click", ()=>{
    if(!g_socket){
      log(`[error] socket == null`);
      return;
    }
    log("emitSolicitedMessageAndWaitResponse");
    g_socket.emitSolicitedMessageAndWaitResponse(
      $("#message_event").val() as string,
      JSON.parse($("#message_body").val() as string)
    )
    .then((x)=>{
      log("emitSolicitedMessageAndWaitResponse -> success");
    })
    .catch((err)=>{
      log("emitSolicitedMessageAndWaitResponse -> error");
    });
  });

  $("#update_pending_solicited_messages").on("click", ()=>{
    doUpdatePendingSolicitedMessages();
  });
});

function log(s: string){
  $("#log").text($("#log").text() + `${s}\n\n`);
}

function doUpdatePendingSolicitedMessages(){
  $(".list_item.template").nextAll().remove();
  if(!g_socket) return;

  RxUtil.doSubscribe("get_pending_solicited_messages",
    from(Object.entries(g_socket.PendingSolicitedMessages).map(([k,v]) => ({[k]:v})))
    .pipe(map((x)=>{
      const li = $(".list_item.template").clone().removeClass("template");
      const key = Object.keys(x)[0];
      const value = Object.values(x)[0] as any;
      const solicited_message_index = parseInt(key);
      const solicited_message_event = value.event as string;
      const solicited_message_body  = value.body as any;

      $(".index", li).val(solicited_message_index);
      $(".message.event", li).val(solicited_message_event);
      $(".message.body", li).val(JSON.stringify(solicited_message_body, null, 1));
      $(".emit", li).on("click", ()=>{
        if(g_socket){
          g_socket.emitSolicitedResponse(
            solicited_message_index,
            $(".response.event", li).val() as string,
            JSON.parse($(".response.body").val() as string)
          )
          .then(()=>{
            doUpdatePendingSolicitedMessages();
          })
          .catch((e)=>{
            alert(JSON.stringify(e, null, 1));
            doUpdatePendingSolicitedMessages();
          });
        }
      });
      return li;
    }))
    .pipe(map((x)=>{
      $("#pending_solicited_messages").append(x);
      x.show();
    }))
  );
}