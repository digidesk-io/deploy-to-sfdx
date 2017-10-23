$(document).ready(() => {

  let actionCount = 0;
  let message = '';

  function update_status(newMessage, excludeCount) {
    actionCount += 1;

    if (excludeCount) {
      message = `${newMessage}\n${message}`;
    } else {
      newMessage = newMessage.replace(/^\s+|\s+$/g, '');
      message = `${actionCount}) ${newMessage}\n${message}`;
    }

    $('textarea#status').val(message);
  }

  
  // deprecate
  function deployingApi(command, timestamp, param) {

    const commandData = {};
    commandData.command = command;
    commandData.timestamp = timestamp;
    commandData.param = param;

    return $.ajax({
      type: 'POST',
      url: '/api/deploying',
      data: JSON.stringify(commandData),
      contentType: 'application/json; charset=utf-8',
      dataType: 'json',
      async: true,
      timeout: 10000000,
      success: (commandDataResponse) => {
        

        update_status(`Job Id: ${commandDataResponse.guid}`);

        return guid;
      },
      error: (commandDataResponse) => {
        update_status(`Sorry, something went wrong. Please contact @WadeWegner on Twitter and send the following error message.\n\nError: ${commandDataResponse.responseText}\n`, true);
        $('div#loaderBlock').hide();
      }
    });
  }

  function poll(stage, guid) {

    var complete = false;
    
    var data = {};
    data.guid = guid;
    data.stage = stage;

    $.ajax({
      url: '/api/status',
      type: 'POST',
      data: data,
      success: function (response) {

        var message = response.message;

        if (message !== '') {
          update_status(message);
          complete = true;
        }
        
      },
      dataType: 'json',
      complete: setTimeout(function () {
        if (!complete) {
          poll(stage, guid);
        }
      }, 2500),
      timeout: 2000
    });
  }

  function createJob(yamlSettings) {

    var guid;

    $.ajax({
      type: 'POST',
      url: '/api/deploy',
      data: JSON.stringify(yamlSettings),
      contentType: 'application/json; charset=utf-8',
      dataType: 'json',
      async: false,
      success: (commandDataResponse) => {
        guid = commandDataResponse.message;
        update_status(`Started job: ${guid}`);
      },
      error: (commandDataResponse) => {
        update_status(`Sorry, something went wrong. Please contact @WadeWegner on Twitter and send the following error message.\n\nError: ${commandDataResponse.responseText}\n`, true);
        $('div#loaderBlock').hide();
      }
    });

    return guid;

    // return deployingApi('clone', timestamp, githubRepo)
    //   .then(() => {
    //     return deployingApi('create', timestamp, yamlSettings.scratchOrgDef);
    //   })
    //   .then(() => {
    //     return deployingApi('push', timestamp);
    //   })
    //   .then(() => {
    //     if (yamlSettings.permsetName) {
    //       return deployingApi('permset', timestamp, yamlSettings.permsetName);
    //     } else {
    //       return null;
    //     }
    //   })
    //   .then(() => {
    //     return deployingApi('test', timestamp, yamlSettings.runApexTests);
    //   })
    //   .then(() => {

    //     // generate url
    //     let commandData = {};
    //     commandData.command = 'url';
    //     commandData.timestamp = timestamp;

    //     return $.ajax({
    //       type: 'POST',
    //       url: '/api/deploying',
    //       data: JSON.stringify(commandData),
    //       contentType: 'application/json; charset=utf-8',
    //       dataType: 'json',
    //       success: (commandDataResponse) => {
    //         update_status(`Generated a login url: ${commandDataResponse.message}`);

    //         const url = commandDataResponse.message;

    //         $('#loginUrl').attr('href', url);
    //         $('#loginUrl').text(`${url.substring(0, 80)}...`);
    //         $('#loginBlock').show();
    //         $('div#loaderBlock').hide();

    //         // clean up
    //         commandData = {};
    //         commandData.command = 'clean';
    //         commandData.timestamp = timestamp;
    //       }
    //     }).then(() => {
    //       return deployingApi('clean', timestamp)
    //         .then(() => {

    //           message = `Finished. You have deployed the app to your scratch org!\n\n${message}`;
    //           $('textarea#status').val(message);

    //         });
    //     });
    //   });
  }

  const githubRepo = $('input#template').val();
  let yamlFile = githubRepo.replace('github.com', 'raw.githubusercontent.com');
  yamlFile += '/master/.salesforcedx.yaml';

  const settings = {};
  settings.githubRepo = githubRepo;

  $.ajax({
    url: yamlFile,
    type: 'GET',
    async: false,
    error: (XMLHttpRequest, textStatus, errorThrown) => {

      settings.assignPermset = 'false';
      settings.permsetName = '';
      settings.deleteScratchOrg = 'false';
      settings.runApexTests = 'false';
      settings.scratchOrgDef = 'config/project-scratch-def.json';
      settings.showScratchOrgUrl = 'true';

      update_status(`Didn't find a .salesforcedx.yaml file. Using defaults:
\tassign-permset: ${settings.assignPermset}
\tpermset-name: ${settings.permsetName}
\tdelete-scratch-org: ${settings.deleteScratchOrg}
\trun-apex-tests: ${settings.runApexTests}
\tscratch-org-def: ${settings.scratchOrgDef}
\tshow-scratch-org-url: ${settings.showScratchOrgUrl}`);

    },
    success: (yamlFileDataResponse, status) => {

      update_status(`Discovered ${yamlFile}`);

      const doc = jsyaml.load(yamlFileDataResponse);

      settings.assignPermset = doc['assign-permset'];
      settings.permsetName = doc['permset-name'];
      settings.deleteScratchOrg = doc['delete-scratch-org'];
      settings.runApexTests = doc['run-apex-tests'];
      settings.scratchOrgDef = doc['scratch-org-def'];
      settings.showScratchOrgUrl = doc['show-scratch-org-url'];

      update_status(`Parsed the following values from the yaml file:
\tassign-permset: ${settings.assignPermset}
\tpermset-name: ${settings.permsetName}
\tdelete-scratch-org: ${settings.deleteScratchOrg}
\trun-apex-tests: ${settings.runApexTests}
\tscratch-org-def: ${settings.scratchOrgDef}
\tshow-scratch-org-url: ${settings.showScratchOrgUrl}`);
    }
  });

  var guid = createJob(settings);

  // alert(guid);
  
  poll('clone', guid);
  
});