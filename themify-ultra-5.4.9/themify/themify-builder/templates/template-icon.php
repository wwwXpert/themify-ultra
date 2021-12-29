<?php

defined( 'ABSPATH' ) || exit;

/**
 * Template Icon
 * 
 * This template can be overridden by copying it to yourtheme/themify-builder/template-icon.php.
 *
 * Access original fields: $args['mod_settings']
 * @author Themify
 */

$fields_default = array(
    'mod_title_icon' => '',
    'icon_size' => '',
    'icon_style' => '',
    'icon_arrangement' => 'icon_horizontal',
    'icon_position' => '',
    'content_icon' => array(),
    'animation_effect' => '',
    'css_icon' => ''
);

$fields_args = wp_parse_args($args['mod_settings'], $fields_default);
unset($args['mod_settings']);
$fields_default=null;
$mod_name=$args['mod_name'];
$builder_id = $args['builder_id'];
$element_id = $args['module_ID'];
if($fields_args['icon_position']!==''){
    $fields_args['icon_position']=str_replace('icon_position_','',$fields_args['icon_position']);
	$fields_args['icon_position']=  'tf_text'.$fields_args['icon_position'][0];
}
$container_class = apply_filters('themify_builder_module_classes', array(
    'module',
    'module-'.$mod_name,
    $element_id,
    $fields_args['css_icon'],
    $fields_args['icon_size'],
    $fields_args['icon_style'],
    $fields_args['icon_arrangement'],
    $fields_args['icon_position']
		), $mod_name, $element_id, $fields_args);

if(!empty($fields_args['global_styles']) && Themify_Builder::$frontedit_active===false){
    $container_class[] = $fields_args['global_styles'];
}
$container_props = apply_filters('themify_builder_module_container_props', self::parse_animation_effect($fields_args,array(
    'class' => implode(' ', $container_class),
)), $fields_args, $mod_name, $element_id);
if(Themify_Builder::$frontedit_active===false){
    $container_props['data-lazy']=1;
}
?>
<!-- module icon -->
<div <?php echo self::get_element_attributes(self::sticky_element_props($container_props,$fields_args)); ?>>
    <?php 
	$container_props=$container_class=null;
	do_action('themify_builder_background_styling',$builder_id,array('styling'=>$fields_args,'mod_name'=>$mod_name),$element_id,'module');
	echo Themify_Builder_Component_Module::get_module_title($fields_args,'mod_title_icon');
	$content_icon = array_filter($fields_args['content_icon']);
	$args=$mod_name=null;
	foreach ($content_icon as $content):
	    $content = wp_parse_args($content, array(
			'label' => '',
			'hide_label' => '',
			'link' => '',
			'icon_type' => 'icon',
			'image' => '',
			'icon' => '',
			'new_window' => false,
			'icon_color_bg' => '', /* deprecated Nov 2021 */
			'bg' => '',
			'c' => '',
			'link_options' => '',
			'lightbox_width' => '',
			'lightbox_height' => '',
			'lightbox_width_unit' => 'px',
			'lightbox_height_unit' => 'px'
	    ));
		$styles = [];
		if ( ! empty( $content['bg'] ) ) {
			$styles[] = 'background-color: ' . Themify_Builder_Stylesheet::get_rgba_color( $content['bg'] );
		}
		if ( ! empty( $content['c'] ) ) {
			$styles[] = 'color: ' . Themify_Builder_Stylesheet::get_rgba_color( $content['c'] );
		}
	    $link_target = $content['link_options'] === 'newtab' ? ' rel="noopener" target="_blank"' : '';
	    $link_lightbox_class = $content['link_options'] === 'lightbox' ? ' class="lightbox-builder themify_lightbox"' : '';
	    $lightbox_data = !empty($content['lightbox_width']) || !empty($content['lightbox_height']) ? sprintf(' data-zoom-config="%s|%s"'
			    , $content['lightbox_width'] . $content['lightbox_width_unit']
			    , $content['lightbox_height'] . $content['lightbox_height_unit']) : false;
	    ?>
	    <div class="module-icon-item<?php echo 'icon_horizontal'===$fields_args['icon_arrangement']?' tf_inline_b':''; ?>">
			<?php if ($content['link']!==''): ?>
				<a href="<?php echo esc_attr($content['link']) ?>"<?php echo $link_target, $lightbox_data, $link_lightbox_class ?>>
			<?php endif; ?>
					<?php
					if($content['icon']!=='' || $content['image']!==''){

						/* backward compatibility with old options */
						if ( ! empty( $content['icon_color_bg'] ) ) {
							if ( $content['icon_color_bg'] === 'default' ) {
								$content['icon_color_bg'] = 'tb_default_color';
							}
							Themify_Builder_Model::load_color_css( $content['icon_color_bg'] );
						}

					}
					?>
				<?php if ('icon'===$content['icon_type'] && $content['icon']!==''): ?>
					<em class="ui tf_vmiddle tf_textc tf_box <?php echo $content['icon_color_bg'] ?>"<?php if ( ! empty( $styles ) ) echo ' style="' . join( ';', $styles ) . '"'; ?>><?php echo themify_get_icon($content['icon']); ?></em>
				<?php endif; ?>
				<?php if ('image'===$content['icon_type'] && $content['image']!==''): ?>
					<img class="tf_vmiddle tf_box ui <?php echo $content['icon_color_bg'] ?>" src="<?php echo $content['image'] ?>"<?php echo $content['label']!==''?' alt="'.$content['label'].'"':''; ?>>
				<?php endif; ?>
				<?php if ( $content['label'] !== '' ) : ?>
                    <?php if ( 'hide' !== $content['hide_label'] ) : ?>
					<span class="tf_vmiddle"<?php self::add_inline_edit_fields('label',true,false,'content_icon')?>><?php echo $content['label'] ?></span>
                    <?php else: ?>
                    <span class="screen-reader-text"><?php echo $content['label'] ?></span>
                    <?php endif; ?>
                <?php endif; ?>
			<?php if ($content['link']!==''): ?>
				</a>
			<?php endif; ?>
	    </div>
	<?php endforeach; ?>
</div>
<!-- /module icon -->
