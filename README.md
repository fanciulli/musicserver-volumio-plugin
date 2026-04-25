### Volumio plugin

The Music Server has Rest APIs that you can use to browse content, search by text and stream songs. If you plan to use with Volumio connect to it via SSH and perform the following:

```
cd /data/plugins/music_service
git clone https://github.com/fanciulli/musicserver-volumio-plugin.git musicserver
cd musicserver
npm install
```

Now edit the file `plugins.json` under /data/plugins in order to add the following under the field `music_service`:

```
"musciserver": {
     		"enabled": {
        	"type": "boolean",
        	"value": true
      	}
```

Restart Volumio. In Volumio UI go to Plugins > Music Server and click on `Settings`. The configuration page is shown. Update it based on your current environment:

![Plugin Settings on Volumio](./media/plugin_settings_on_volumio.png)

Restart Volumio. The Browse shall now show a new source.
